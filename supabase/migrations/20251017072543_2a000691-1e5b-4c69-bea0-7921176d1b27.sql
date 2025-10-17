-- Fix the update_subscriber_property_count trigger to include organization_id
CREATE OR REPLACE FUNCTION public.update_subscriber_property_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  affected_user_id uuid;
  old_user_id uuid;
  new_property_count integer;
  old_property_count integer;
  user_org_id uuid;
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
      -- Get old user's organization_id
      SELECT organization_id INTO user_org_id
      FROM profiles 
      WHERE id = old_user_id;
      
      -- Count old user's properties
      SELECT COUNT(*) INTO old_property_count
      FROM properties 
      WHERE user_id = old_user_id;
      
      -- Update old user's subscriber record
      INSERT INTO subscribers (user_id, email, organization_id, active_properties_count, created_at, updated_at)
      VALUES (
        old_user_id,
        (SELECT email FROM auth.users WHERE id = old_user_id),
        user_org_id,
        old_property_count,
        now(),
        now()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        active_properties_count = old_property_count,
        updated_at = now();
      
      RAISE LOG 'Updated property count for old user %: %', old_user_id, old_property_count;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    affected_user_id := OLD.user_id;
  END IF;
  
  -- Get the affected user's organization_id from their profile
  SELECT organization_id INTO user_org_id
  FROM profiles 
  WHERE id = affected_user_id;
  
  IF user_org_id IS NULL THEN
    RAISE WARNING 'User % has no organization_id in profile - cannot sync subscriber', affected_user_id;
    -- Still return the row to allow the property operation to complete
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;
  
  -- Count current properties for the affected user
  SELECT COUNT(*) INTO new_property_count
  FROM properties 
  WHERE user_id = affected_user_id;
  
  -- Update or insert subscriber record with organization_id
  INSERT INTO subscribers (user_id, email, organization_id, active_properties_count, created_at, updated_at)
  VALUES (
    affected_user_id,
    (SELECT email FROM auth.users WHERE id = affected_user_id),
    user_org_id,
    new_property_count,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    active_properties_count = new_property_count,
    organization_id = user_org_id,
    updated_at = now();
  
  RAISE LOG 'Updated property count for user %: % (org: %)', affected_user_id, new_property_count, user_org_id;
  
  -- Return the appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;