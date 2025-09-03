-- Organization Consolidation Migration (Fixed)
-- Consolidate duplicate organizations safely

-- Step 1: Create audit table
CREATE TABLE IF NOT EXISTS organization_consolidation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_org_id UUID,
  target_org_id UUID,
  org_name TEXT,
  consolidation_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  consolidation_reason TEXT
);

-- Step 2: Remove duplicate user_organizations to avoid constraint violations
DELETE FROM user_organizations 
WHERE organization_id IN ('ddaedf74-8893-40af-8039-24094f1a0551', '8f530443-3ab7-41e9-a353-9305dfd89332', 'f7a06195-8697-4505-94f8-b75c4693a21a')
AND user_id IN (
  SELECT user_id 
  FROM user_organizations 
  WHERE organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
);

DELETE FROM user_organizations 
WHERE organization_id = '037bdf44-ee80-4459-ab58-34dfa25d720a'
AND user_id IN (
  SELECT user_id 
  FROM user_organizations 
  WHERE organization_id = '2f691249-e161-4fea-b27a-133302b63005'
);

-- Step 3: Update all remaining user_organizations
UPDATE user_organizations 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id IN ('ddaedf74-8893-40af-8039-24094f1a0551', '8f530443-3ab7-41e9-a353-9305dfd89332', 'f7a06195-8697-4505-94f8-b75c4693a21a');

UPDATE user_organizations 
SET organization_id = '2f691249-e161-4fea-b27a-133302b63005'
WHERE organization_id = '037bdf44-ee80-4459-ab58-34dfa25d720a';

-- Step 4: Update profiles
UPDATE profiles 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id IN ('ddaedf74-8893-40af-8039-24094f1a0551', '8f530443-3ab7-41e9-a353-9305dfd89332', 'f7a06195-8697-4505-94f8-b75c4693a21a');

UPDATE profiles 
SET session_organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE session_organization_id IN ('ddaedf74-8893-40af-8039-24094f1a0551', '8f530443-3ab7-41e9-a353-9305dfd89332', 'f7a06195-8697-4505-94f8-b75c4693a21a');

UPDATE profiles 
SET organization_id = '2f691249-e161-4fea-b27a-133302b63005'
WHERE organization_id = '037bdf44-ee80-4459-ab58-34dfa25d720a';

UPDATE profiles 
SET session_organization_id = '2f691249-e161-4fea-b27a-133302b63005'
WHERE session_organization_id = '037bdf44-ee80-4459-ab58-34dfa25d720a';

-- Step 5: Update contractors
UPDATE contractors 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id IN ('ddaedf74-8893-40af-8039-24094f1a0551', '8f530443-3ab7-41e9-a353-9305dfd89332', 'f7a06195-8697-4505-94f8-b75c4693a21a');

-- Step 6: Update maintenance requests
UPDATE maintenance_requests 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id IN ('ddaedf74-8893-40af-8039-24094f1a0551', '8f530443-3ab7-41e9-a353-9305dfd89332', 'f7a06195-8697-4505-94f8-b75c4693a21a');

-- Step 7: Update all other tables
UPDATE quotes 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id IN ('ddaedf74-8893-40af-8039-24094f1a0551', '8f530443-3ab7-41e9-a353-9305dfd89332', 'f7a06195-8697-4505-94f8-b75c4693a21a');

UPDATE properties 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id IN ('ddaedf74-8893-40af-8039-24094f1a0551', '8f530443-3ab7-41e9-a353-9305dfd89332', 'f7a06195-8697-4505-94f8-b75c4693a21a');

UPDATE notifications 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id IN ('ddaedf74-8893-40af-8039-24094f1a0551', '8f530443-3ab7-41e9-a353-9305dfd89332', 'f7a06195-8697-4505-94f8-b75c4693a21a');

UPDATE activity_logs 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id IN ('ddaedf74-8893-40af-8039-24094f1a0551', '8f530443-3ab7-41e9-a353-9305dfd89332', 'f7a06195-8697-4505-94f8-b75c4693a21a');

UPDATE invoices 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id IN ('ddaedf74-8893-40af-8039-24094f1a0551', '8f530443-3ab7-41e9-a353-9305dfd89332', 'f7a06195-8697-4505-94f8-b75c4693a21a');

UPDATE job_schedules 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id IN ('ddaedf74-8893-40af-8039-24094f1a0551', '8f530443-3ab7-41e9-a353-9305dfd89332', 'f7a06195-8697-4505-94f8-b75c4693a21a');

UPDATE job_scheduling_history 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id IN ('ddaedf74-8893-40af-8039-24094f1a0551', '8f530443-3ab7-41e9-a353-9305dfd89332', 'f7a06195-8697-4505-94f8-b75c4693a21a');

UPDATE property_budgets 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id IN ('ddaedf74-8893-40af-8039-24094f1a0551', '8f530443-3ab7-41e9-a353-9305dfd89332', 'f7a06195-8697-4505-94f8-b75c4693a21a');

UPDATE quote_logs 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id IN ('ddaedf74-8893-40af-8039-24094f1a0551', '8f530443-3ab7-41e9-a353-9305dfd89332', 'f7a06195-8697-4505-94f8-b75c4693a21a');

-- Step 8: Record consolidations in audit trail
INSERT INTO organization_consolidation_audit (
  original_org_id, target_org_id, org_name, consolidation_reason
) VALUES 
('ddaedf74-8893-40af-8039-24094f1a0551', 'f93788fa-0edd-496d-bd14-a35ece2f0fb5', 'Ashwani Kumar''s Organization', 'Consolidated duplicate org ddaedf74'),
('8f530443-3ab7-41e9-a353-9305dfd89332', 'f93788fa-0edd-496d-bd14-a35ece2f0fb5', 'Ashwani Kumar''s Organization', 'Consolidated duplicate org 8f530443'),
('f7a06195-8697-4505-94f8-b75c4693a21a', 'f93788fa-0edd-496d-bd14-a35ece2f0fb5', 'Ashwani Kumar''s Organization', 'Consolidated duplicate org f7a06195'),
('037bdf44-ee80-4459-ab58-34dfa25d720a', '2f691249-e161-4fea-b27a-133302b63005', 'Manager User''s Organization', 'Consolidated duplicate org 037bdf44');

-- Step 9: Delete the now-empty duplicate organizations
DELETE FROM organizations 
WHERE id IN (
  'ddaedf74-8893-40af-8039-24094f1a0551',
  '8f530443-3ab7-41e9-a353-9305dfd89332', 
  'f7a06195-8697-4505-94f8-b75c4693a21a',
  '037bdf44-ee80-4459-ab58-34dfa25d720a'
);

-- Add documentation
COMMENT ON TABLE organization_consolidation_audit IS 'Audit trail for organization consolidation operations - tracks elimination of duplicate organizations to resolve data fragmentation';