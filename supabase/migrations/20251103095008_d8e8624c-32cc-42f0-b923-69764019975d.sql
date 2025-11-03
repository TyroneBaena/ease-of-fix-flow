-- CRITICAL FIX: Optimize RLS policies to avoid per-row function calls
-- The current RLS policies call get_current_user_organization_safe() for EVERY ROW
-- which causes hundreds of database queries and 60+ second timeouts

-- Drop existing slow policies
DROP POLICY IF EXISTS "Users can manage maintenance requests in their organization" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can manage properties in their organization" ON properties;

-- Create optimized policies using subqueries instead of per-row function calls
-- This will execute the subquery ONCE per query instead of once per row

CREATE POLICY "Users can manage maintenance requests in their organization" 
ON maintenance_requests
FOR ALL
TO public
USING (
  organization_id = (
    SELECT COALESCE(session_organization_id, organization_id)
    FROM profiles
    WHERE id = auth.uid()
    LIMIT 1
  )
)
WITH CHECK (
  organization_id = (
    SELECT COALESCE(session_organization_id, organization_id)
    FROM profiles
    WHERE id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "Users can manage properties in their organization" 
ON properties
FOR ALL
TO public
USING (
  organization_id = (
    SELECT COALESCE(session_organization_id, organization_id)
    FROM profiles
    WHERE id = auth.uid()
    LIMIT 1
  )
)
WITH CHECK (
  organization_id = (
    SELECT COALESCE(session_organization_id, organization_id)
    FROM profiles
    WHERE id = auth.uid()
    LIMIT 1
  )
);

-- Also optimize the profiles policies
DROP POLICY IF EXISTS "Admins and managers can view organization profiles" ON profiles;

CREATE POLICY "Admins and managers can view organization profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  organization_id = (
    SELECT COALESCE(p.session_organization_id, p.organization_id)
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'manager')
    LIMIT 1
  )
);

-- Note: These optimized policies will execute the subquery once per query
-- instead of calling security definer functions for every row
-- This should reduce query time from 60+ seconds to under 1 second