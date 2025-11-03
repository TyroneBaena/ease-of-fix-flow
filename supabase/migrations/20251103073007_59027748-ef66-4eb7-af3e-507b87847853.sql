-- Allow contractors to view their own profile
CREATE POLICY "Contractors can view their own profile"
ON public.contractors
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);