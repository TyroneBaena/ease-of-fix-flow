-- URGENT FIX: Revert RLS policies to use security definer functions
-- The subquery optimization caused infinite recursion because it queries
-- the same table the policy is on, triggering the policy recursively

-- Drop the broken policies
DROP POLICY IF EXISTS "Users can manage maintenance requests in their organization" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can manage properties in their organization" ON properties;
DROP POLICY IF EXISTS "Admins and managers can view organization profiles" ON profiles;

-- Restore policies using security definer functions (which bypass RLS)
CREATE POLICY "Users can manage maintenance requests in their organization" 
ON maintenance_requests
FOR ALL
TO public
USING (organization_id = get_current_user_organization_safe())
WITH CHECK (organization_id = get_current_user_organization_safe());

CREATE POLICY "Users can manage properties in their organization" 
ON properties
FOR ALL
TO public
USING (organization_id = get_current_user_organization_safe())
WITH CHECK (organization_id = get_current_user_organization_safe());

CREATE POLICY "Admins and managers can view organization profiles"
ON profiles
FOR SELECT
TO authenticated
USING (can_view_organization_profiles(auth.uid(), organization_id));

-- The performance issue needs to be solved differently
-- Security definer functions are the correct approach for RLS