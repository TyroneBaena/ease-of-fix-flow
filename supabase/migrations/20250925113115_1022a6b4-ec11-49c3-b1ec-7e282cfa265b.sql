-- Fix property count trigger issues
-- This migration fixes the bug where active_properties_count wasn't being updated correctly

-- Drop existing triggers and function
DROP TRIGGER IF EXISTS trigger_update_property_count_on_insert ON properties;
DROP TRIGGER IF EXISTS trigger_update_property_count_on_delete ON properties;
DROP TRIGGER IF EXISTS trigger_update_property_count_on_update ON properties;
DROP FUNCTION IF EXISTS update_subscriber_property_count();

-- Create improved function to update subscriber property count
CREATE OR REPLACE FUNCTION update_subscriber_property_count()
RETURNS TRIGGER AS $$
DECLARE
  affected_org_id uuid;
  property_count integer;
  updated_count integer := 0;
BEGIN
  -- Get the organization_id from the property
  IF TG_OP = 'DELETE' THEN
    affected_org_id := OLD.organization_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle both old and new organization if organization changed
    affected_org_id := NEW.organization_id;
    -- If organization changed, also update the old organization
    IF OLD.organization_id != NEW.organization_id THEN
      -- Update old organization
      SELECT COUNT(*) INTO property_count
      FROM properties 
      WHERE properties.organization_id = OLD.organization_id;
      
      UPDATE subscribers 
      SET active_properties_count = property_count,
          updated_at = now()
      WHERE user_id IN (
        SELECT pr.id 
        FROM profiles pr 
        WHERE pr.organization_id = OLD.organization_id
      );
      
      GET DIAGNOSTICS updated_count = ROW_COUNT;
      RAISE LOG 'Updated % subscribers in old organization % with property count %', 
        updated_count, OLD.organization_id, property_count;
    END IF;
  ELSE
    affected_org_id := NEW.organization_id;
  END IF;
  
  -- Count active properties in the affected organization
  SELECT COUNT(*) INTO property_count
  FROM properties 
  WHERE properties.organization_id = affected_org_id;
  
  -- Update all subscribers in this organization
  UPDATE subscribers 
  SET active_properties_count = property_count,
      updated_at = now()
  WHERE user_id IN (
    SELECT pr.id 
    FROM profiles pr 
    WHERE pr.organization_id = affected_org_id
  );
  
  -- Log how many rows were updated
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE LOG 'Updated % subscribers in organization % with property count %', 
    updated_count, affected_org_id, property_count;
  
  -- Return appropriate row
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for all property operations
CREATE TRIGGER trigger_update_property_count_on_insert
  AFTER INSERT ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriber_property_count();

CREATE TRIGGER trigger_update_property_count_on_delete
  AFTER DELETE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriber_property_count();

CREATE TRIGGER trigger_update_property_count_on_update
  AFTER UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriber_property_count();

-- Create function to manually sync property counts (for fixing data)
CREATE OR REPLACE FUNCTION sync_all_property_counts()
RETURNS TABLE(org_id uuid, property_count integer, subscribers_updated integer) AS $$
DECLARE
  org_record record;
  prop_count integer;
  sub_updated integer;
BEGIN
  -- Loop through each organization that has properties or subscribers
  FOR org_record IN 
    SELECT DISTINCT orgs.org_id
    FROM (
      SELECT properties.organization_id as org_id FROM properties WHERE properties.organization_id IS NOT NULL
      UNION
      SELECT pr.organization_id as org_id FROM profiles pr 
      JOIN subscribers s ON pr.id = s.user_id 
      WHERE pr.organization_id IS NOT NULL
    ) orgs
  LOOP
    -- Count properties for this organization
    SELECT COUNT(*) INTO prop_count
    FROM properties 
    WHERE properties.organization_id = org_record.org_id;
    
    -- Update subscribers in this organization
    UPDATE subscribers 
    SET active_properties_count = prop_count,
        updated_at = now()
    WHERE user_id IN (
      SELECT pr.id 
      FROM profiles pr 
      WHERE pr.organization_id = org_record.org_id
    );
    
    GET DIAGNOSTICS sub_updated = ROW_COUNT;
    
    RAISE LOG 'Synced organization %: % properties, % subscribers updated', 
      org_record.org_id, prop_count, sub_updated;
    
    -- Return the results
    RETURN QUERY SELECT org_record.org_id, prop_count, sub_updated;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the sync to fix existing data
SELECT * FROM sync_all_property_counts();