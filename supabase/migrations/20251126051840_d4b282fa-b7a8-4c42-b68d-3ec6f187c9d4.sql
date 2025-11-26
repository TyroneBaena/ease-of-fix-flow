-- Make request_id nullable since not all activities are related to maintenance requests
ALTER TABLE public.activity_logs 
ALTER COLUMN request_id DROP NOT NULL;

-- Update the ensure_activity_log_organization function to handle nullable request_id
CREATE OR REPLACE FUNCTION public.ensure_activity_log_organization()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;