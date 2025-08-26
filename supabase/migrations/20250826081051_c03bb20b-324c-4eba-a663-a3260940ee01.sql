-- Fix the inconsistency by consolidating all admin checks to use get_current_user_role()
-- and clean up duplicate policies

-- Drop all remaining conflicting policies that use different admin check methods
DROP POLICY IF EXISTS "maintenance_requests_select_policy" ON maintenance_requests;
DROP POLICY IF EXISTS "maintenance_requests_update_policy" ON maintenance_requests;
DROP POLICY IF EXISTS "maintenance_requests_insert_policy" ON maintenance_requests;
DROP POLICY IF EXISTS "maintenance_requests_delete_policy" ON maintenance_requests;

-- Create unified policies using consistent admin checking
CREATE POLICY "maintenance_requests_select_unified"
ON maintenance_requests
FOR SELECT
USING (
  get_current_user_role() = 'admin' OR 
  user_id = auth.uid() OR 
  user_has_property_access(property_id) OR 
  (is_contractor_user() AND contractor_id = get_contractor_id()) OR 
  (is_contractor_user() AND quote_requested = true)
);

CREATE POLICY "maintenance_requests_insert_unified"
ON maintenance_requests
FOR INSERT
WITH CHECK (
  get_current_user_role() = 'admin' OR 
  (user_id = auth.uid() AND user_has_property_access(property_id))
);

CREATE POLICY "maintenance_requests_update_unified" 
ON maintenance_requests
FOR UPDATE
USING (
  get_current_user_role() = 'admin' OR 
  user_id = auth.uid() OR 
  user_has_property_access(property_id) OR 
  (is_contractor_user() AND contractor_id = get_contractor_id())
);

CREATE POLICY "maintenance_requests_delete_unified"
ON maintenance_requests  
FOR DELETE
USING (
  get_current_user_role() = 'admin' OR 
  user_id = auth.uid() OR 
  user_has_property_access(property_id)
);