-- Fix property count synchronization triggers for subscribers table

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_property_count_on_insert ON properties;
DROP TRIGGER IF EXISTS trigger_update_property_count_on_update ON properties; 
DROP TRIGGER IF EXISTS trigger_update_property_count_on_delete ON properties;

-- Drop existing functions if they exist (with proper signature)
DROP FUNCTION IF EXISTS update_subscriber_property_count();
DROP FUNCTION IF EXISTS sync_all_property_counts();

-- Create the property count update function
CREATE OR REPLACE FUNCTION update_subscriber_property_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_user_id uuid;
  old_user_id uuid;
  new_property_count integer;
  old_property_count integer;
BEGIN
  -- Handle different trigger operations
  IF TG_OP = 'INSERT' THEN
    affected_user_id := NEW.user_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle user_id changes (property reassignment)
    old_user_id := OLD.user_id;
    affected_user_id := NEW.user_id;
    
    -- If user_id changed, update both old and new user counts
    IF old_user_id != affected_user_id THEN
      -- Update old user's count
      SELECT COUNT(*) INTO old_property_count
      FROM properties 
      WHERE user_id = old_user_id;
      
      UPDATE subscribers 
      SET active_properties_count = old_property_count,
          updated_at = now()
      WHERE user_id = old_user_id;
      
      RAISE LOG 'Updated property count for old user %: %', old_user_id, old_property_count;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    affected_user_id := OLD.user_id;
  END IF;
  
  -- Count current properties for the affected user
  SELECT COUNT(*) INTO new_property_count
  FROM properties 
  WHERE user_id = affected_user_id;
  
  -- Update or insert subscriber record
  INSERT INTO subscribers (user_id, email, active_properties_count, created_at, updated_at)
  VALUES (
    affected_user_id,
    (SELECT email FROM auth.users WHERE id = affected_user_id),
    new_property_count,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    active_properties_count = new_property_count,
    updated_at = now();
  
  RAISE LOG 'Updated property count for user %: %', affected_user_id, new_property_count;
  
  -- Return the appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create triggers for property changes
CREATE TRIGGER trigger_update_property_count_on_insert
  AFTER INSERT ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriber_property_count();

CREATE TRIGGER trigger_update_property_count_on_update
  AFTER UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriber_property_count();

CREATE TRIGGER trigger_update_property_count_on_delete
  AFTER DELETE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriber_property_count();

-- Create function to sync all property counts (for maintenance)
CREATE OR REPLACE FUNCTION sync_all_property_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  property_count integer;
BEGIN
  -- Loop through all users who have properties
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM properties 
    WHERE user_id IS NOT NULL
  LOOP
    -- Count properties for this user
    SELECT COUNT(*) INTO property_count
    FROM properties 
    WHERE user_id = user_record.user_id;
    
    -- Update subscriber record
    INSERT INTO subscribers (user_id, email, active_properties_count, created_at, updated_at)
    VALUES (
      user_record.user_id,
      (SELECT email FROM auth.users WHERE id = user_record.user_id),
      property_count,
      now(),
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      active_properties_count = property_count,
      updated_at = now();
      
    RAISE LOG 'Synced property count for user %: %', user_record.user_id, property_count;
  END LOOP;
  
  RAISE NOTICE 'Successfully synced property counts for all users';
END;
$$;