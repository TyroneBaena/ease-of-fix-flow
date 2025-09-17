-- Fix RLS policy for profiles to allow users to update their own profile during organization onboarding
-- The current policy fails when users try to set their first organization_id because get_current_user_organization() returns null

-- Drop and recreate the profile update policy to handle the onboarding case
DROP POLICY IF EXISTS "Users can update profiles in their organization" ON public.profiles;

-- Create new policy that allows:
-- 1. Users to update their own profile (including setting their first organization_id)
-- 2. Admins to update profiles in their organization
CREATE POLICY "Users can update profiles in their organization" 
ON public.profiles 
FOR UPDATE 
USING (
  -- User can update their own profile
  id = auth.uid() 
  OR 
  -- Admin can update profiles in their organization (only if both user and admin have organization_id set)
  (
    get_current_user_role() = 'admin' 
    AND organization_id IS NOT NULL 
    AND organization_id = get_current_user_organization()
  )
)
WITH CHECK (
  -- User can update their own profile
  id = auth.uid() 
  OR 
  -- Admin can update profiles in their organization (only if both user and admin have organization_id set)
  (
    get_current_user_role() = 'admin' 
    AND organization_id IS NOT NULL 
    AND organization_id = get_current_user_organization()
  )
);

-- Also ensure the insert policy allows users to create their profile with organization_id
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (id = auth.uid());

-- Update the user_organizations insert policy to handle organization creation
DROP POLICY IF EXISTS "Allow organization membership creation during signup" ON public.user_organizations;

CREATE POLICY "Allow organization membership creation during signup" 
ON public.user_organizations 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
);