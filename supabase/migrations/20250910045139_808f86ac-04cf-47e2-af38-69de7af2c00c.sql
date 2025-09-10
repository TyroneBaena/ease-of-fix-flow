-- Clean up existing cross-organization notifications

-- Delete notifications where user's organization doesn't match notification's organization
DELETE FROM public.notifications n
WHERE EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.id = n.user_id 
  AND p.organization_id != n.organization_id
);

-- Add a check to ensure notifications always match user's organization in future
CREATE OR REPLACE FUNCTION public.validate_notification_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_org_id uuid;
BEGIN
  -- Get the user's organization
  SELECT organization_id INTO user_org_id
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Ensure notification organization matches user's organization
  IF user_org_id IS NULL THEN
    RAISE EXCEPTION 'User must belong to an organization to receive notifications';
  END IF;
  
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := user_org_id;
  ELSIF NEW.organization_id != user_org_id THEN
    RAISE EXCEPTION 'Cannot send notification from organization % to user in organization %', NEW.organization_id, user_org_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to validate notifications
CREATE TRIGGER validate_notification_organization_trigger
  BEFORE INSERT OR UPDATE ON public.notifications
  FOR EACH ROW 
  EXECUTE FUNCTION public.validate_notification_organization();