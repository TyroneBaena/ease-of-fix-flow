-- SAFE Organization Consolidation Migration
-- Handle duplicates carefully to avoid constraint violations

-- Step 1: Create audit table for tracking consolidation
CREATE TABLE IF NOT EXISTS organization_consolidation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_org_id UUID,
  target_org_id UUID,
  org_name TEXT,
  users_moved INTEGER DEFAULT 0,
  requests_moved INTEGER DEFAULT 0,
  contractors_moved INTEGER DEFAULT 0,
  properties_moved INTEGER DEFAULT 0,
  consolidation_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  consolidation_reason TEXT
);

-- Step 2: Handle user_organizations table carefully - remove duplicates first
-- For Ashwani Kumar's Organization consolidation
DELETE FROM user_organizations 
WHERE organization_id IN ('ddaedf74-8893-40af-8039-24094f1a0551', '8f530443-3ab7-41e9-a353-9305dfd89332', 'f7a06195-8697-4505-94f8-b75c4693a21a')
AND user_id IN (
  SELECT user_id 
  FROM user_organizations 
  WHERE organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
);

-- For Manager User's Organization consolidation  
DELETE FROM user_organizations 
WHERE organization_id = '037bdf44-ee80-4459-ab58-34dfa25d720a'
AND user_id IN (
  SELECT user_id 
  FROM user_organizations 
  WHERE organization_id = '2f691249-e161-4fea-b27a-133302b63005'
);

-- Step 3: Update remaining user_organizations records
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

-- Step 7: Update other related tables  
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

-- Step 8: Record consolidations for audit trail
INSERT INTO organization_consolidation_audit (
  original_org_id, target_org_id, org_name, consolidation_reason
) VALUES 
('ddaedf74-8893-40af-8039-24094f1a0551', 'f93788fa-0edd-496d-bd14-a35ece2f0fb5', 'Ashwani Kumar''s Organization', 'Consolidation: ddaedf74 -> f93788fa'),
('8f530443-3ab7-41e9-a353-9305dfd89332', 'f93788fa-0edd-496d-bd14-a35ece2f0fb5', 'Ashwani Kumar''s Organization', 'Consolidation: 8f530443 -> f93788fa'),
('f7a06195-8697-4505-94f8-b75c4693a21a', 'f93788fa-0edd-496d-bd14-a35ece2f0fb5', 'Ashwani Kumar''s Organization', 'Consolidation: f7a06195 -> f93788fa'),
('037bdf44-ee80-4459-ab58-34dfa25d720a', '2f691249-e161-4fea-b27a-133302b63005', 'Manager User''s Organization', 'Consolidation: 037bdf44 -> 2f691249');

-- Step 9: Delete the empty duplicate organizations
DELETE FROM organizations 
WHERE id IN (
  'ddaedf74-8893-40af-8039-24094f1a0551',
  '8f530443-3ab7-41e9-a353-9305dfd89332', 
  'f7a06195-8697-4505-94f8-b75c4693a21a',
  '037bdf44-ee80-4459-ab58-34dfa25d720a'
);

-- Step 10: Add protection against future duplicates
DO $$
BEGIN
  -- Add unique constraint on organization name per created_by if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_org_name_per_creator' 
    AND table_name = 'organizations'
  ) THEN
    ALTER TABLE organizations 
    ADD CONSTRAINT unique_org_name_per_creator 
    UNIQUE (name, COALESCE(created_by, '00000000-0000-0000-0000-000000000000'));
  END IF;
END $$;

-- Add comments
COMMENT ON TABLE organization_consolidation_audit IS 'Tracks organization consolidation to fix duplicate organization data fragmentation';
COMMENT ON CONSTRAINT unique_org_name_per_creator ON organizations IS 'Prevents duplicate organization names per creator to avoid future fragmentation';