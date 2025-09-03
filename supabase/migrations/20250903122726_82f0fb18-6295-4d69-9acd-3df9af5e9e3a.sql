-- Update RLS policy to allow admins to update user profiles in their organization
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update profiles in their organization" 
ON public.profiles 
FOR UPDATE 
USING (
  -- Users can update their own profile OR admins can update profiles in their organization
  id = auth.uid() 
  OR (
    get_current_user_role() = 'admin' 
    AND organization_id = get_current_user_organization()
  )
) 
WITH CHECK (
  -- Same check for the updated data
  id = auth.uid() 
  OR (
    get_current_user_role() = 'admin' 
    AND organization_id = get_current_user_organization()
  )
);