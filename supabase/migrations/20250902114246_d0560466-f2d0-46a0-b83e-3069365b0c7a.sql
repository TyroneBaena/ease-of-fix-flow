-- Continue organization-based multi-tenancy setup - Part 2

-- 6. Add triggers to enforce organization_id on critical tables
DROP TRIGGER IF EXISTS ensure_organization_id_maintenance_requests ON public.maintenance_requests;
CREATE TRIGGER ensure_organization_id_maintenance_requests
  BEFORE INSERT ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.ensure_user_organization_access();

DROP TRIGGER IF EXISTS ensure_organization_id_properties ON public.properties;
CREATE TRIGGER ensure_organization_id_properties
  BEFORE INSERT ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.ensure_user_organization_access();

DROP TRIGGER IF EXISTS ensure_organization_id_contractors ON public.contractors;
CREATE TRIGGER ensure_organization_id_contractors
  BEFORE INSERT ON public.contractors
  FOR EACH ROW EXECUTE FUNCTION public.ensure_user_organization_access();

DROP TRIGGER IF EXISTS ensure_organization_id_comments ON public.comments;
CREATE TRIGGER ensure_organization_id_comments
  BEFORE INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.ensure_user_organization_access();

-- 7. Create function for organization-based audit logging
CREATE OR REPLACE FUNCTION public.log_organization_access(
  action_type TEXT,
  table_name TEXT,
  record_id UUID DEFAULT NULL,
  additional_info JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.activity_logs (
    organization_id,
    action_type,
    description,
    actor_name,
    actor_role,
    metadata
  ) VALUES (
    public.get_current_user_organization(),
    action_type,
    format('Access to %s table', table_name),
    (SELECT name FROM public.profiles WHERE id = auth.uid()),
    public.get_current_user_role(),
    jsonb_build_object(
      'table_name', table_name,
      'record_id', record_id,
      'timestamp', now(),
      'additional_info', additional_info
    )
  );
END;
$function$;

-- 8. Ensure get_current_user_organization is robust
CREATE OR REPLACE FUNCTION public.get_current_user_organization()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  IF org_id IS NULL THEN
    RAISE LOG 'User % has no organization_id in profiles table', auth.uid();
  END IF;
  
  RETURN org_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error getting organization for user %: %', auth.uid(), SQLERRM;
    RETURN NULL;
END;
$function$;

-- 9. Create organization management functions
CREATE OR REPLACE FUNCTION public.can_manage_organization(org_id UUID)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user is admin role and belongs to the organization
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND organization_id = org_id
    AND role = 'admin'
  );
END;
$function$;