-- Fix database function security issues by adding search_path
-- Also create property count sync trigger that was missing

-- First, let's create the trigger function to sync property counts
CREATE OR REPLACE FUNCTION public.sync_property_count_to_subscriber()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  affected_user_id uuid;
  property_count integer;
BEGIN
  -- Determine which user_id to update based on operation
  IF TG_OP = 'INSERT' THEN
    affected_user_id := NEW.user_id;
  ELSIF TG_OP = 'UPDATE' THEN
    affected_user_id := NEW.user_id;
    -- If user_id changed, also update the old user
    IF OLD.user_id != NEW.user_id THEN
      SELECT COUNT(*) INTO property_count
      FROM properties 
      WHERE user_id = OLD.user_id;
      
      UPDATE subscribers 
      SET active_properties_count = property_count,
          updated_at = now()
      WHERE user_id = OLD.user_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    affected_user_id := OLD.user_id;
  END IF;
  
  -- Count properties for the affected user
  SELECT COUNT(*) INTO property_count
  FROM properties 
  WHERE user_id = affected_user_id;
  
  -- Update subscriber record
  UPDATE subscribers 
  SET active_properties_count = property_count,
      updated_at = now()
  WHERE user_id = affected_user_id;
  
  -- Log the sync
  RAISE LOG 'Synced property count for user %: %', affected_user_id, property_count;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create the trigger on properties table
DROP TRIGGER IF EXISTS sync_property_count_trigger ON properties;
CREATE TRIGGER sync_property_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION sync_property_count_to_subscriber();

-- Fix search_path for existing functions that are missing it
ALTER FUNCTION public.get_current_financial_year() SET search_path = 'public';
ALTER FUNCTION public.is_admin() SET search_path = 'public';
ALTER FUNCTION public.get_user_role_for_maintenance() SET search_path = 'public';
ALTER FUNCTION public.analytics_query(text) SET search_path = 'public';