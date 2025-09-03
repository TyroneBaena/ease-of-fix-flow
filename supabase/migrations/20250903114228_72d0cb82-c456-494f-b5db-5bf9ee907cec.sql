-- Fix RLS security issue on audit table
ALTER TABLE organization_consolidation_audit ENABLE ROW LEVEL SECURITY;

-- Add RLS policy - only admins can view consolidation audit data
CREATE POLICY "Only admins can view organization consolidation audit" 
ON organization_consolidation_audit 
FOR SELECT 
USING (get_current_user_role() = 'admin');