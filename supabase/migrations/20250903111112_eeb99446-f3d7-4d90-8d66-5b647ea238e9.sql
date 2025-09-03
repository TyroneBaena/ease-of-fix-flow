-- CRITICAL FIX: Cross-Organization Contractor Assignment Bug
-- This migration fixes a severe security vulnerability where contractors
-- could be assigned to maintenance requests from different organizations

-- Step 1: Log all cross-organization assignments for audit trail
CREATE TABLE IF NOT EXISTS cross_org_assignments_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID,
  request_org_id UUID,
  contractor_id UUID,
  contractor_org_id UUID,
  cleaned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  cleaned_by TEXT DEFAULT 'system_migration'
);

-- Insert audit records for all cross-organization assignments
INSERT INTO cross_org_assignments_audit (
  request_id, 
  request_org_id, 
  contractor_id, 
  contractor_org_id
)
SELECT 
  mr.id,
  mr.organization_id,
  mr.contractor_id,
  c.organization_id
FROM maintenance_requests mr
JOIN contractors c ON mr.contractor_id = c.id
WHERE mr.contractor_id IS NOT NULL 
  AND mr.organization_id != c.organization_id;

-- Step 2: Clean up cross-organization assignments
-- Reset maintenance requests that violate organization boundaries
UPDATE maintenance_requests 
SET 
  contractor_id = NULL,
  assigned_at = NULL,
  status = CASE 
    WHEN status = 'in-progress' THEN 'pending'
    WHEN status = 'completed' THEN 'pending' -- Reset completed ones too for safety
    ELSE status 
  END,
  quote_requested = false,
  quoted_amount = NULL,
  completion_percentage = 0,
  completion_photos = NULL,
  progress_notes = NULL
WHERE id IN (
  SELECT mr.id
  FROM maintenance_requests mr
  JOIN contractors c ON mr.contractor_id = c.id
  WHERE mr.contractor_id IS NOT NULL 
    AND mr.organization_id != c.organization_id
);

-- Step 3: Clean up related data that might reference invalid assignments
-- Remove quotes from cross-organization assignments
DELETE FROM quotes 
WHERE id IN (
  SELECT q.id
  FROM quotes q
  JOIN maintenance_requests mr ON q.request_id = mr.id
  JOIN contractors c ON q.contractor_id = c.id
  WHERE mr.organization_id != c.organization_id
);

-- Remove quote logs from cross-organization assignments
DELETE FROM quote_logs 
WHERE id IN (
  SELECT ql.id
  FROM quote_logs ql
  JOIN quotes q ON ql.quote_id = q.id
  JOIN maintenance_requests mr ON q.request_id = mr.id
  JOIN contractors c ON q.contractor_id = c.id
  WHERE mr.organization_id != c.organization_id
);

-- Remove job schedules from cross-organization assignments
DELETE FROM job_schedules 
WHERE id IN (
  SELECT js.id
  FROM job_schedules js
  JOIN maintenance_requests mr ON js.request_id = mr.id
  JOIN contractors c ON js.contractor_id = c.id
  WHERE mr.organization_id != c.organization_id
);

-- Remove job scheduling history from cross-organization assignments
DELETE FROM job_scheduling_history 
WHERE id IN (
  SELECT jsh.id
  FROM job_scheduling_history jsh
  JOIN maintenance_requests mr ON jsh.request_id = mr.id
  JOIN contractors c ON jsh.contractor_id = c.id
  WHERE mr.organization_id != c.organization_id
);

-- Step 4: Create function to validate contractor-request organization match
CREATE OR REPLACE FUNCTION validate_contractor_request_organization()
RETURNS TRIGGER AS $$
DECLARE
  request_org_id UUID;
  contractor_org_id UUID;
BEGIN
  -- Only check if contractor_id is being set
  IF NEW.contractor_id IS NOT NULL THEN
    -- Get the request's organization
    request_org_id := NEW.organization_id;
    
    -- Get the contractor's organization
    SELECT organization_id INTO contractor_org_id
    FROM contractors 
    WHERE id = NEW.contractor_id;
    
    -- Validate organizations match
    IF request_org_id != contractor_org_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Cannot assign contractor from organization % to request from organization %. Cross-organization assignments are prohibited.', 
        contractor_org_id, request_org_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 5: Create trigger to prevent future cross-organization assignments
DROP TRIGGER IF EXISTS prevent_cross_org_contractor_assignment ON maintenance_requests;
CREATE TRIGGER prevent_cross_org_contractor_assignment
  BEFORE INSERT OR UPDATE OF contractor_id
  ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_contractor_request_organization();

-- Step 6: Create function to validate quote organization boundaries
CREATE OR REPLACE FUNCTION validate_quote_organization()
RETURNS TRIGGER AS $$
DECLARE
  request_org_id UUID;
  contractor_org_id UUID;
BEGIN
  -- Get the request's organization
  SELECT organization_id INTO request_org_id
  FROM maintenance_requests 
  WHERE id = NEW.request_id;
  
  -- Get the contractor's organization
  SELECT organization_id INTO contractor_org_id
  FROM contractors 
  WHERE id = NEW.contractor_id;
  
  -- Validate organizations match
  IF request_org_id != contractor_org_id THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: Cannot create quote from contractor in organization % for request in organization %. Cross-organization quotes are prohibited.', 
      contractor_org_id, request_org_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 7: Create trigger to prevent cross-organization quotes
DROP TRIGGER IF EXISTS prevent_cross_org_quotes ON quotes;
CREATE TRIGGER prevent_cross_org_quotes
  BEFORE INSERT OR UPDATE
  ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION validate_quote_organization();

-- Step 8: Create function to validate job schedule organization boundaries
CREATE OR REPLACE FUNCTION validate_job_schedule_organization()
RETURNS TRIGGER AS $$
DECLARE
  request_org_id UUID;
  contractor_org_id UUID;
BEGIN
  -- Get the request's organization
  SELECT organization_id INTO request_org_id
  FROM maintenance_requests 
  WHERE id = NEW.request_id;
  
  -- Get the contractor's organization
  SELECT organization_id INTO contractor_org_id
  FROM contractors 
  WHERE id = NEW.contractor_id;
  
  -- Validate organizations match
  IF request_org_id != contractor_org_id THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: Cannot create job schedule for contractor in organization % for request in organization %. Cross-organization scheduling is prohibited.', 
      contractor_org_id, request_org_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 9: Create trigger to prevent cross-organization job schedules
DROP TRIGGER IF EXISTS prevent_cross_org_job_schedules ON job_schedules;
CREATE TRIGGER prevent_cross_org_job_schedules
  BEFORE INSERT OR UPDATE
  ON job_schedules
  FOR EACH ROW
  EXECUTE FUNCTION validate_job_schedule_organization();

-- Step 10: Create monitoring view for security compliance
CREATE OR REPLACE VIEW security_compliance_check AS
SELECT 
  'Cross-Org Contractor Assignments' as check_name,
  COUNT(*) as violation_count,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'CRITICAL_FAILURE' END as status
FROM maintenance_requests mr
JOIN contractors c ON mr.contractor_id = c.id
WHERE mr.contractor_id IS NOT NULL 
  AND mr.organization_id != c.organization_id

UNION ALL

SELECT 
  'Cross-Org Quotes' as check_name,
  COUNT(*) as violation_count,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'CRITICAL_FAILURE' END as status
FROM quotes q
JOIN maintenance_requests mr ON q.request_id = mr.id
JOIN contractors c ON q.contractor_id = c.id
WHERE mr.organization_id != c.organization_id

UNION ALL

SELECT 
  'Cross-Org Job Schedules' as check_name,
  COUNT(*) as violation_count,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'CRITICAL_FAILURE' END as status
FROM job_schedules js
JOIN maintenance_requests mr ON js.request_id = mr.id
JOIN contractors c ON js.contractor_id = c.id
WHERE mr.organization_id != c.organization_id;

-- Step 11: Add database-level documentation
COMMENT ON FUNCTION validate_contractor_request_organization() IS 'Security function: Prevents cross-organization contractor assignments. Critical for multi-tenant data isolation.';
COMMENT ON FUNCTION validate_quote_organization() IS 'Security function: Prevents cross-organization quotes. Critical for multi-tenant data isolation.';
COMMENT ON FUNCTION validate_job_schedule_organization() IS 'Security function: Prevents cross-organization job scheduling. Critical for multi-tenant data isolation.';
COMMENT ON VIEW security_compliance_check IS 'Security monitoring: Real-time check for multi-tenant isolation violations. Should always show PASS status.';
COMMENT ON TABLE cross_org_assignments_audit IS 'Audit trail: Records all cross-organization assignments that were cleaned up during security fix migration.';