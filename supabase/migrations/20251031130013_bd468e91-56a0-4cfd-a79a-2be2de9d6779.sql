-- Fix 1: Explicitly deny public access to profiles table
CREATE POLICY "Deny public access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false);

-- Fix 2: Explicitly deny public access to contractors table
CREATE POLICY "Deny public access to contractors"
ON public.contractors
FOR ALL
TO anon
USING (false);

-- Fix 3: Protect admin_user_list view by recreating it with security_invoker
DROP VIEW IF EXISTS public.admin_user_list;

CREATE VIEW public.admin_user_list
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.name,
  p.organization_id,
  p.created_at,
  COALESCE(ur.role::text, 'user') as role
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id;

-- Add comment explaining the view security
COMMENT ON VIEW public.admin_user_list IS 'Admin user list view with security_invoker=true. Inherits RLS from profiles table - only accessible to authenticated users who can view the underlying profiles.';