-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins and managers can view organization profiles" ON public.profiles;

-- Create a security definer function to check if user can view org profiles
CREATE OR REPLACE FUNCTION public.can_view_organization_profiles(_viewer_id uuid, _target_profile_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _viewer_id
    AND organization_id = _target_profile_org_id
    AND role IN ('admin', 'manager')
  )
$$;

-- Create the correct policy using the security definer function
CREATE POLICY "Admins and managers can view organization profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.can_view_organization_profiles(auth.uid(), organization_id)
);