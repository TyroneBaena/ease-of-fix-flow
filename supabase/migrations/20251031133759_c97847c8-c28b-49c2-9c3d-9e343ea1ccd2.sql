-- Allow admins and managers to view profiles in their organization
CREATE POLICY "Admins and managers can view organization profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Users can view profiles in their organization if they are admin or manager
  EXISTS (
    SELECT 1 FROM public.profiles viewer
    WHERE viewer.id = auth.uid()
    AND viewer.organization_id = profiles.organization_id
    AND viewer.role IN ('admin', 'manager')
  )
);