-- Fix 1: Sync all property counts immediately
-- This will update all 13 subscribers with incorrect counts
DO $$
DECLARE
  user_record RECORD;
  property_count integer;
BEGIN
  -- Loop through all users who have subscribers
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM subscribers
  LOOP
    -- Count actual properties for this user
    SELECT COUNT(*) INTO property_count
    FROM properties 
    WHERE user_id = user_record.user_id;
    
    -- Update subscriber record
    UPDATE subscribers 
    SET active_properties_count = property_count,
        updated_at = now()
    WHERE user_id = user_record.user_id;
      
    RAISE LOG 'Synced property count for user %: %', user_record.user_id, property_count;
  END LOOP;
  
  RAISE NOTICE 'Successfully synced property counts for all subscribers';
END $$;

-- Fix 2: Add comprehensive RLS policies for user_organizations table
-- The existing policies are actually correct, but let's add one more for organization managers

-- Allow organization managers to add users to their organization
CREATE POLICY "Organization managers can add members to their organization"
ON public.user_organizations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.user_organizations uo
    WHERE uo.user_id = auth.uid()
    AND uo.organization_id = user_organizations.organization_id
    AND uo.role IN ('admin', 'manager')
    AND uo.is_active = true
  )
);

-- Fix 3: Ensure property count trigger is always active
-- Recreate the trigger to make sure it's working properly
DROP TRIGGER IF EXISTS sync_property_count_trigger ON properties;

CREATE TRIGGER sync_property_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON properties
FOR EACH ROW
EXECUTE FUNCTION update_subscriber_property_count();

-- Verify trigger exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'sync_property_count_trigger'
  ) THEN
    RAISE NOTICE 'Property count sync trigger is active ✅';
  ELSE
    RAISE WARNING 'Property count sync trigger is missing ⚠️';
  END IF;
END $$;