-- Fix profiles RLS policy to allow first-time organization assignment
-- This allows users to set their organization_id when it's currently NULL

-- Drop the restrictive policy that blocks initial organization assignment
DROP POLICY IF EXISTS "Organization admins can update profiles in their organization" ON public.profiles;

-- Create a new policy that allows:
-- 1. Users to update their own profile (including setting organization_id for the first time)
-- 2. Organization admins to update profiles in their organization
CREATE POLICY "Users can update own profile or admins can update org profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  -- User can update their own profile
  (id = auth.uid())
  OR
  -- OR admin can update profiles in their organization (only if org is already set)
  (
    (get_current_user_role_safe() = 'admin'::text) 
    AND (organization_id IS NOT NULL) 
    AND (organization_id = get_current_user_organization_safe())
  )
)
WITH CHECK (
  -- User can update their own profile
  (id = auth.uid())
  OR
  -- OR admin can update profiles in their organization (only if org is already set)
  (
    (get_current_user_role_safe() = 'admin'::text) 
    AND (organization_id IS NOT NULL) 
    AND (organization_id = get_current_user_organization_safe())
  )
);