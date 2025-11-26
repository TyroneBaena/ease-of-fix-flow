-- Temporarily disable the audit trigger using a DO block
DO $$ 
BEGIN
  -- Try to disable the trigger if it exists
  EXECUTE 'ALTER TABLE public.user_roles DISABLE TRIGGER audit_user_role_changes_trigger';
EXCEPTION
  WHEN undefined_object THEN
    -- Trigger doesn't exist, that's fine
    NULL;
END $$;

-- Backfill missing user_roles entries from profiles
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, p.role::app_role
FROM public.profiles p
WHERE p.role IN ('admin', 'manager', 'contractor')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = p.role::app_role
  );

-- Re-enable the audit trigger using a DO block
DO $$ 
BEGIN
  -- Try to enable the trigger if it exists
  EXECUTE 'ALTER TABLE public.user_roles ENABLE TRIGGER audit_user_role_changes_trigger';
EXCEPTION
  WHEN undefined_object THEN
    -- Trigger doesn't exist, that's fine
    NULL;
END $$;

-- Create function to sync profile role changes to user_roles
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_user_roles()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete old role entries if role changed
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    DELETE FROM public.user_roles WHERE user_id = NEW.id;
  END IF;
  
  -- Insert new role entry
  IF NEW.role IN ('admin', 'manager', 'contractor') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, NEW.role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically sync profile role changes
DROP TRIGGER IF EXISTS sync_profile_role_to_user_roles_trigger ON public.profiles;
CREATE TRIGGER sync_profile_role_to_user_roles_trigger
AFTER INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_role_to_user_roles();