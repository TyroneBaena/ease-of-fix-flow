-- Create a read-only version of get_current_user_organization for RLS policies
CREATE OR REPLACE FUNCTION public.get_current_user_organization_readonly()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  org_id uuid;
  user_uuid uuid;
BEGIN
  user_uuid := auth.uid();
  
  IF user_uuid IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- First try to get session organization (no updates!)
  SELECT session_organization_id INTO org_id
  FROM public.profiles
  WHERE id = user_uuid;
  
  -- If no session organization, get default organization (but don't update)
  IF org_id IS NULL THEN
    org_id := public.get_user_default_organization(user_uuid);
  END IF;
  
  RETURN org_id;
END;
$$;

-- Create a read-only version of get_current_user_role for RLS policies
CREATE OR REPLACE FUNCTION public.get_current_user_role_readonly()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  user_uuid uuid;
  current_org_id uuid;
BEGIN
  user_uuid := auth.uid();
  
  -- Get current organization without updating anything
  SELECT session_organization_id INTO current_org_id
  FROM public.profiles
  WHERE id = user_uuid;
  
  -- If no session organization, get default without updating
  IF current_org_id IS NULL THEN
    current_org_id := public.get_user_default_organization(user_uuid);
  END IF;
  
  -- Get role from user_organizations table for current organization
  SELECT role INTO user_role
  FROM public.user_organizations
  WHERE user_id = user_uuid 
  AND organization_id = current_org_id
  AND is_active = true;
  
  -- Fallback to profiles table role
  IF user_role IS NULL THEN
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = user_uuid;
  END IF;
  
  RETURN COALESCE(user_role, 'manager');
END;
$$;

-- Update all RLS policies to use read-only functions
DROP POLICY IF EXISTS "Organization admins can update profiles in their organization" ON public.profiles;
CREATE POLICY "Organization admins can update profiles in their organization" 
ON public.profiles 
FOR UPDATE 
USING ((get_current_user_role_readonly() = 'admin') AND (organization_id IS NOT NULL) AND (organization_id = get_current_user_organization_readonly()))
WITH CHECK ((get_current_user_role_readonly() = 'admin') AND (organization_id IS NOT NULL) AND (organization_id = get_current_user_organization_readonly()));

DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
CREATE POLICY "Users can view profiles in their organization" 
ON public.profiles 
FOR SELECT 
USING (organization_id = get_current_user_organization_readonly());

DROP POLICY IF EXISTS "Users can manage contractors in their organization" ON public.contractors;
CREATE POLICY "Users can manage contractors in their organization" 
ON public.contractors 
FOR ALL 
USING (organization_id = get_current_user_organization_readonly())
WITH CHECK (organization_id = get_current_user_organization_readonly());

DROP POLICY IF EXISTS "Users can manage properties in their organization" ON public.properties;
CREATE POLICY "Users can manage properties in their organization" 
ON public.properties 
FOR ALL 
USING (organization_id = get_current_user_organization_readonly())
WITH CHECK (organization_id = get_current_user_organization_readonly());

-- Fix the user's profile to have the correct organization_id
UPDATE public.profiles 
SET organization_id = 'da1bd8c2-debc-4a84-8975-29c0f76af9a4',
    role = 'admin'
WHERE email = 'cogileca@forexzig.com';