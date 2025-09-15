-- Fix user_organizations RLS policies to allow inserts during organization creation

-- Drop existing restrictive policies on user_organizations
DROP POLICY IF EXISTS "Users can update their own organization memberships" ON public.user_organizations;
DROP POLICY IF EXISTS "Users can view their own organization memberships" ON public.user_organizations;

-- Create new policies that allow organization creators to manage memberships
CREATE POLICY "Users can view their own organization memberships" 
ON public.user_organizations 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own organization memberships" 
ON public.user_organizations 
FOR UPDATE 
USING (user_id = auth.uid());

-- Allow authenticated users to create organization memberships during signup
CREATE POLICY "Allow organization membership creation during signup" 
ON public.user_organizations 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  user_id = auth.uid()
);

-- Allow organization admins to create memberships for their organization
CREATE POLICY "Organization admins can create memberships" 
ON public.user_organizations 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = organization_id 
    AND created_by = auth.uid()
  )
);