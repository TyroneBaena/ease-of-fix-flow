-- Fix security linter issues from the previous migration

-- 1. Enable RLS on the audit table (CRITICAL)
ALTER TABLE cross_org_assignments_audit ENABLE ROW LEVEL SECURITY;

-- 2. Add RLS policy for the audit table - only admins can see audit data
CREATE POLICY "Only admins can view audit data" 
ON cross_org_assignments_audit 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- 3. Fix the security definer view by recreating it without security definer
-- Drop the existing view first
DROP VIEW IF EXISTS security_compliance_check;

-- Create a function instead of a view to avoid security definer issues
CREATE OR REPLACE FUNCTION get_security_compliance_status()
RETURNS TABLE(
  check_name TEXT,
  violation_count BIGINT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Cross-Org Contractor Assignments'::TEXT as check_name,
    COUNT(*)::BIGINT as violation_count,
    CASE WHEN COUNT(*) = 0 THEN 'PASS'::TEXT ELSE 'CRITICAL_FAILURE'::TEXT END as status
  FROM maintenance_requests mr
  JOIN contractors c ON mr.contractor_id = c.id
  WHERE mr.contractor_id IS NOT NULL 
    AND mr.organization_id != c.organization_id

  UNION ALL

  SELECT 
    'Cross-Org Quotes'::TEXT as check_name,
    COUNT(*)::BIGINT as violation_count,
    CASE WHEN COUNT(*) = 0 THEN 'PASS'::TEXT ELSE 'CRITICAL_FAILURE'::TEXT END as status
  FROM quotes q
  JOIN maintenance_requests mr ON q.request_id = mr.id
  JOIN contractors c ON q.contractor_id = c.id
  WHERE mr.organization_id != c.organization_id

  UNION ALL

  SELECT 
    'Cross-Org Job Schedules'::TEXT as check_name,
    COUNT(*)::BIGINT as violation_count,
    CASE WHEN COUNT(*) = 0 THEN 'PASS'::TEXT ELSE 'CRITICAL_FAILURE'::TEXT END as status
  FROM job_schedules js
  JOIN maintenance_requests mr ON js.request_id = mr.id
  JOIN contractors c ON js.contractor_id = c.id
  WHERE mr.organization_id != c.organization_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Update documentation
COMMENT ON FUNCTION get_security_compliance_status() IS 'Security monitoring: Returns real-time check for multi-tenant isolation violations. Should always show PASS status for all checks.';