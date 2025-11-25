-- Fix the cleanup trigger to use empty string instead of NULL for practice_leader
CREATE OR REPLACE FUNCTION public.cleanup_practice_leader_on_property_unassignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed_property_id UUID;
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
    
    -- For each removed property, clear practice leader if it matches this manager
    IF removed_property_ids IS NOT NULL AND array_length(removed_property_ids, 1) > 0 THEN
      FOREACH removed_property_id IN ARRAY removed_property_ids
      LOOP
        -- Update property to clear practice leader if email matches
        -- Use empty string for practice_leader since it's NOT NULL
        UPDATE properties
        SET 
          practice_leader = '',
          practice_leader_email = NULL,
          practice_leader_phone = NULL,
          updated_at = now()
        WHERE id = removed_property_id
          AND practice_leader_email = OLD.email;
        
        -- Log the cleanup
        IF FOUND THEN
          RAISE LOG 'Cleared practice leader % from property % due to property unassignment', 
            OLD.email, removed_property_id;
        END IF;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;