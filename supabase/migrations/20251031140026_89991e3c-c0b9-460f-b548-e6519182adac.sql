-- ============================================
-- Fix: Add Explicit Access Controls for admin_user_list View
-- ============================================

-- The admin_user_list view is already configured with security_invoker = true,
-- which means it inherits RLS policies from the underlying profiles table.
-- However, we'll add explicit GRANT permissions for clarity and security.

-- Revoke all default public access
REVOKE ALL ON public.admin_user_list FROM PUBLIC;
REVOKE ALL ON public.admin_user_list FROM anon;

-- Grant SELECT only to authenticated users
-- (they still need to pass the underlying profiles table RLS policies)
GRANT SELECT ON public.admin_user_list TO authenticated;

-- Add a comment explaining the security model
COMMENT ON VIEW public.admin_user_list IS 
'Secure view of user list for admin dashboards. Uses security_invoker=true to inherit RLS from profiles table. Only authenticated users with proper organization access can query this view. Does not expose PII (email, phone) - use get_user_profile_by_id() function for that with audit logging.';