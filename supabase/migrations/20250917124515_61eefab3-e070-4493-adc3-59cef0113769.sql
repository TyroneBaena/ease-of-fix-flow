-- Fix RLS policy to allow users to update their own profile during organization onboarding
DROP POLICY IF EXISTS "Users can update profiles in their organization" ON public.profiles;

-- Create separate policies for better control
CREATE POLICY "Users can update their own profile"
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Organization admins can update profiles in their organization"  
ON public.profiles
FOR UPDATE
USING (
  (get_current_user_role() = 'admin'::text) 
  AND (organization_id IS NOT NULL) 
  AND (organization_id = get_current_user_organization())
)
WITH CHECK (
  (get_current_user_role() = 'admin'::text) 
  AND (organization_id IS NOT NULL) 
  AND (organization_id = get_current_user_organization())
);