-- Drop the conflicting INSERT policies for organizations
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create new organizations" ON public.organizations;

-- Create a single, clear INSERT policy for organizations
CREATE POLICY "Allow authenticated users to create organizations" 
ON public.organizations 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);