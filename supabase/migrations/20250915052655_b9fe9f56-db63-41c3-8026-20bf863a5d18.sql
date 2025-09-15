-- Create a debugging function for organization creation
CREATE OR REPLACE FUNCTION public.debug_organization_creation()
RETURNS TABLE(
  auth_uid uuid,
  is_authenticated boolean,
  profile_exists boolean,
  current_org_id uuid
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as auth_uid,
    auth.uid() IS NOT NULL as is_authenticated,
    EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid()) as profile_exists,
    public.get_current_user_organization() as current_org_id;
END;
$$;

-- Temporarily make INSERT policy more permissive for debugging
DROP POLICY IF EXISTS "Allow authenticated users to create organizations" ON public.organizations;

CREATE POLICY "Allow authenticated users to create organizations" 
ON public.organizations 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND auth.uid() = created_by
);