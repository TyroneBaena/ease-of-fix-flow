-- Add INSERT policy for organizations table to allow users to create organizations
CREATE POLICY "Users can create organizations" 
ON public.organizations 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Also add a policy to allow users to create organizations even without current organization context
CREATE POLICY "Authenticated users can create new organizations" 
ON public.organizations 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);