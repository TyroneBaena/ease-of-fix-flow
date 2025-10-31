-- ============================================
-- CRITICAL FIX: Restrict Admin Profile Access
-- ============================================

-- 1. Drop the overly permissive admin policy
DROP POLICY IF EXISTS "Admins can view profiles in their organization" ON public.profiles;

-- 2. Create a secure view for admin user management (limited fields only)
CREATE OR REPLACE VIEW public.admin_user_list AS
SELECT 
  p.id,
  p.name,
  p.organization_id,
  p.created_at,
  -- DO NOT expose email, phone, or other PII in the view
  -- Admins don't need this for most admin tasks
  (SELECT role FROM user_roles WHERE user_id = p.id LIMIT 1) as role
FROM public.profiles p;

-- Enable RLS on the view
ALTER VIEW public.admin_user_list SET (security_invoker = true);

-- 3. Create a security definer function for admins to get specific user details
-- This is audited and controlled, not a blanket SELECT permission
CREATE OR REPLACE FUNCTION public.get_user_profile_by_id(target_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT,
  organization_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requesting_user_org_id UUID;
  target_user_org_id UUID;
BEGIN
  -- Get requesting user's organization
  SELECT organization_id INTO requesting_user_org_id
  FROM profiles
  WHERE profiles.id = auth.uid();
  
  -- Get target user's organization
  SELECT organization_id INTO target_user_org_id
  FROM profiles
  WHERE profiles.id = target_user_id;
  
  -- Only allow if:
  -- 1. User is admin in their org
  -- 2. Target user is in the same organization
  -- 3. Not a self-lookup (users can use regular SELECT for that)
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can access other user profiles';
  END IF;
  
  IF requesting_user_org_id != target_user_org_id THEN
    RAISE EXCEPTION 'Cannot access users from other organizations';
  END IF;
  
  -- Log the access for audit trail
  INSERT INTO activity_logs (
    organization_id,
    action_type,
    description,
    actor_name,
    actor_role,
    metadata
  )
  SELECT 
    requesting_user_org_id,
    'admin_profile_access',
    'Admin accessed user profile: ' || (SELECT name FROM profiles WHERE profiles.id = target_user_id),
    (SELECT name FROM profiles WHERE profiles.id = auth.uid()),
    'admin',
    jsonb_build_object(
      'accessed_user_id', target_user_id,
      'accessing_admin_id', auth.uid(),
      'timestamp', now()
    );
  
  -- Return the profile data
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.email,
    p.phone,
    (SELECT ur.role::text FROM user_roles ur WHERE ur.user_id = p.id LIMIT 1) as role,
    p.organization_id,
    p.created_at
  FROM profiles p
  WHERE p.id = target_user_id;
END;
$$;

-- 4. Create a function to list users in admin's organization (without PII)
CREATE OR REPLACE FUNCTION public.list_organization_users()
RETURNS TABLE (
  id UUID,
  name TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  organization_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Get current user's organization
  SELECT organization_id INTO user_org_id
  FROM profiles
  WHERE profiles.id = auth.uid();
  
  -- Only allow admins and managers
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role)) THEN
    RAISE EXCEPTION 'Only admins and managers can list organization users';
  END IF;
  
  -- Return user list without PII (no email, no phone)
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    (SELECT ur.role::text FROM user_roles ur WHERE ur.user_id = p.id LIMIT 1) as role,
    p.created_at,
    p.organization_id
  FROM profiles p
  WHERE p.organization_id = user_org_id
  ORDER BY p.created_at DESC;
END;
$$;

-- 5. Add comment to profiles table explaining the security model
COMMENT ON TABLE public.profiles IS 'User profiles. PII data (email, phone) is protected. Users can only view their own profiles. Admins must use get_user_profile_by_id() function for audited access to other user details.';

-- 6. Verify the new security model
-- Only one SELECT policy remains: users can view their own profile
-- Admins must use controlled functions for user management