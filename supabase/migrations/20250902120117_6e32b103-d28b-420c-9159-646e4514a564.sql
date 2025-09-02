-- Fix historical activity logs missing organization_id
-- Step 1: Update activity logs that have request_id by getting org from maintenance_requests
UPDATE public.activity_logs 
SET organization_id = (
  SELECT mr.organization_id 
  FROM maintenance_requests mr 
  WHERE mr.id = activity_logs.request_id
)
WHERE organization_id IS NULL 
AND request_id IS NOT NULL
AND EXISTS (
  SELECT 1 FROM maintenance_requests mr 
  WHERE mr.id = activity_logs.request_id 
  AND mr.organization_id IS NOT NULL
);

-- Step 2: Update remaining activity logs by matching actor_name to user profiles
UPDATE public.activity_logs 
SET organization_id = (
  SELECT p.organization_id 
  FROM profiles p 
  WHERE p.name = activity_logs.actor_name
  AND p.organization_id IS NOT NULL
  LIMIT 1
)
WHERE organization_id IS NULL 
AND actor_name IS NOT NULL
AND EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.name = activity_logs.actor_name 
  AND p.organization_id IS NOT NULL
);

-- Step 3: For any remaining logs without organization_id, assign to oldest organization
-- (this handles edge cases where actor_name doesn't match)
UPDATE public.activity_logs 
SET organization_id = (
  SELECT id FROM organizations 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE organization_id IS NULL;

-- Step 4: Add trigger to ensure future activity logs always have organization_id
CREATE OR REPLACE FUNCTION public.ensure_activity_log_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- If organization_id is not set, try to get it from current user
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := public.get_current_user_organization();
    
    -- If still null and we have a request_id, get it from the request
    IF NEW.organization_id IS NULL AND NEW.request_id IS NOT NULL THEN
      SELECT mr.organization_id INTO NEW.organization_id
      FROM maintenance_requests mr
      WHERE mr.id = NEW.request_id;
    END IF;
    
    -- If still null, this is an error - activity logs must have organization_id
    IF NEW.organization_id IS NULL THEN
      RAISE EXCEPTION 'Activity log must have organization_id';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 5: Create trigger on activity_logs table
DROP TRIGGER IF EXISTS ensure_activity_log_organization_trigger ON public.activity_logs;
CREATE TRIGGER ensure_activity_log_organization_trigger
  BEFORE INSERT OR UPDATE ON public.activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_activity_log_organization();

-- Step 6: Add NOT NULL constraint to prevent future NULL values
ALTER TABLE public.activity_logs 
ALTER COLUMN organization_id SET NOT NULL;