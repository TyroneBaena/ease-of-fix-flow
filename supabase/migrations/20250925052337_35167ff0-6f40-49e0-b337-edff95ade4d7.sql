-- Create function to update subscriber property count
CREATE OR REPLACE FUNCTION update_subscriber_property_count()
RETURNS TRIGGER AS $$
DECLARE
  user_org_id uuid;
  property_count integer;
BEGIN
  -- Get the organization_id from the property
  IF TG_OP = 'DELETE' THEN
    user_org_id := OLD.organization_id;
  ELSE
    user_org_id := NEW.organization_id;
  END IF;
  
  -- Count active properties in this organization
  SELECT COUNT(*) INTO property_count
  FROM properties 
  WHERE organization_id = user_org_id;
  
  -- Update all subscribers in this organization
  UPDATE subscribers 
  SET active_properties_count = property_count,
      updated_at = now()
  WHERE user_id IN (
    SELECT p.id 
    FROM profiles p 
    WHERE p.organization_id = user_org_id
  );
  
  -- Log the update
  RAISE LOG 'Updated property count to % for organization %', property_count, user_org_id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for property count tracking
CREATE OR REPLACE TRIGGER trigger_update_property_count_on_insert
  AFTER INSERT ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriber_property_count();

CREATE OR REPLACE TRIGGER trigger_update_property_count_on_delete
  AFTER DELETE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriber_property_count();

-- Initialize property counts for existing subscribers
CREATE OR REPLACE FUNCTION initialize_property_counts()
RETURNS void AS $$
DECLARE
  org_record record;
  property_count integer;
BEGIN
  -- Loop through each organization
  FOR org_record IN 
    SELECT DISTINCT organization_id 
    FROM profiles 
    WHERE organization_id IS NOT NULL
  LOOP
    -- Count properties for this organization
    SELECT COUNT(*) INTO property_count
    FROM properties 
    WHERE organization_id = org_record.organization_id;
    
    -- Update subscribers in this organization
    UPDATE subscribers 
    SET active_properties_count = property_count,
        updated_at = now()
    WHERE user_id IN (
      SELECT p.id 
      FROM profiles p 
      WHERE p.organization_id = org_record.organization_id
    );
    
    RAISE LOG 'Initialized property count to % for organization %', property_count, org_record.organization_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the initialization
SELECT initialize_property_counts();

-- Add comments for documentation
COMMENT ON FUNCTION update_subscriber_property_count() IS 'Automatically updates active_properties_count in subscribers table when properties are added/removed';
COMMENT ON TRIGGER trigger_update_property_count_on_insert ON properties IS 'Updates subscriber property count when new property is added';
COMMENT ON TRIGGER trigger_update_property_count_on_delete ON properties IS 'Updates subscriber property count when property is deleted';