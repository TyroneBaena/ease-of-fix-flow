-- Tighten properties table RLS to restrict visibility
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Remove overly permissive policy
DROP POLICY IF EXISTS "Allow authenticated users to view all properties" ON public.properties;

-- Admins can view all properties
CREATE POLICY properties_select_admin
ON public.properties
FOR SELECT
TO authenticated
USING (public.get_current_user_role() = 'admin');

-- Property owners can view their own properties
CREATE POLICY properties_select_owner
ON public.properties
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Assigned managers can view properties they have access to
CREATE POLICY properties_select_assigned_managers
ON public.properties
FOR SELECT
TO authenticated
USING (public.user_has_property_access(id));