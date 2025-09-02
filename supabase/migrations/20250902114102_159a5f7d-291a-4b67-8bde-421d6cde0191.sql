-- Remove conflicting tenant schema system and implement clean organization-based multi-tenancy

-- 1. Drop tenant schema related functions
DROP FUNCTION IF EXISTS public.create_tenant_schema(uuid, text);
DROP FUNCTION IF EXISTS public.use_tenant_schema(text);
DROP FUNCTION IF EXISTS public.get_user_schema();
DROP FUNCTION IF EXISTS public.handle_new_user_schema();

-- 2. Drop tenant_schemas table (keep data for migration reference)
-- Note: We'll keep the table for now but stop using it

-- 3. Ensure all tables have organization_id and proper defaults
ALTER TABLE public.profiles 
  ALTER COLUMN organization_id SET NOT NULL;

-- 4. Update organization creation trigger to be more robust
CREATE OR REPLACE FUNCTION public.create_organization_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id UUID;
  org_name TEXT;
  org_slug TEXT;
  attempt INTEGER := 0;
  max_attempts INTEGER := 5;
BEGIN
  -- Only create organization if user doesn't have one
  IF NEW.organization_id IS NULL THEN
    LOOP
      attempt := attempt + 1;
      
      -- Simple organization name from email
      org_name := split_part(NEW.email, '@', 1) || '''s Organization';
      
      -- Generate unique slug with attempt counter
      org_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9]', '', 'g')) || 
                  substr(md5(random()::text || attempt::text), 1, 6);
      
      -- Try to create organization
      BEGIN
        INSERT INTO public.organizations (name, slug, created_by)
        VALUES (org_name, org_slug, NEW.id)
        RETURNING id INTO new_org_id;
        
        -- Update the user's profile with the organization_id
        UPDATE public.profiles 
        SET organization_id = new_org_id 
        WHERE id = NEW.id;
        
        RAISE LOG 'Created organization % for user %', new_org_id, NEW.id;
        EXIT; -- Success, exit loop
        
      EXCEPTION
        WHEN unique_violation THEN
          -- Slug collision, try again
          IF attempt >= max_attempts THEN
            RAISE EXCEPTION 'Failed to create unique organization slug after % attempts', max_attempts;
          END IF;
          CONTINUE;
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE LOG 'Error creating organization for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- 5. Create function to ensure user has organization access
CREATE OR REPLACE FUNCTION public.ensure_user_organization_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure the record gets the current user's organization_id
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := public.get_current_user_organization();
    
    -- If still null, this is an error
    IF NEW.organization_id IS NULL THEN
      RAISE EXCEPTION 'User must belong to an organization to create records';
    END IF;
  END IF;
  
  -- Verify user has access to the specified organization
  IF NEW.organization_id != public.get_current_user_organization() THEN
    RAISE EXCEPTION 'Access denied: cannot create records for different organization';
  END IF;
  
  RETURN NEW;
END;
$function$;

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

-- 10. Update RLS policies to be consistent across all tables
-- Ensure all policies use get_current_user_organization() for consistency

-- Update profiles policies
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
CREATE POLICY "Users can view profiles in their organization"
ON public.profiles FOR SELECT
USING (organization_id = public.get_current_user_organization());

-- Ensure organization table has proper policy
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
CREATE POLICY "Users can view their own organization"
ON public.organizations FOR SELECT
USING (id = public.get_current_user_organization());

DROP POLICY IF EXISTS "Users can update their own organization" ON public.organizations;
CREATE POLICY "Users can update their own organization"
ON public.organizations FOR UPDATE
USING (id = public.get_current_user_organization())
WITH CHECK (id = public.get_current_user_organization());

-- Add admin-only policy for organization management
DROP POLICY IF EXISTS "Admins can manage organizations" ON public.organizations;
CREATE POLICY "Admins can manage organizations"
ON public.organizations FOR ALL
USING (public.can_manage_organization(id))
WITH CHECK (public.can_manage_organization(id));