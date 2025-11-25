-- Fix the cleanup trigger to clear practice leader from ALL properties, not just unassigned ones
CREATE OR REPLACE FUNCTION public.cleanup_practice_leader_on_property_unassignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed_property_ids UUID[];
BEGIN
  -- Only proceed if assigned_properties has changed
  IF OLD.assigned_properties IS DISTINCT FROM NEW.assigned_properties THEN
    -- Find properties that were removed (in OLD but not in NEW)
    SELECT ARRAY(
      SELECT unnest(OLD.assigned_properties)
      EXCEPT
      SELECT unnest(NEW.assigned_properties)
    ) INTO removed_property_ids;
    
    -- If any properties were removed from this manager's assignments
    IF removed_property_ids IS NOT NULL AND array_length(removed_property_ids, 1) > 0 THEN
      -- Clear this manager as practice leader from ALL properties that have them assigned
      -- (not just the unassigned properties)
      UPDATE properties
      SET 
        practice_leader = '',
        practice_leader_email = NULL,
        practice_leader_phone = NULL,
        updated_at = now()
      WHERE practice_leader_email = OLD.email;
      
      -- Log the cleanup
      IF FOUND THEN
        RAISE LOG 'Cleared practice leader % from all properties due to property unassignment', OLD.email;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;