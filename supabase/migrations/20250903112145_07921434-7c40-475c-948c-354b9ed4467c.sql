-- CRITICAL FIX: Consolidate Duplicate Organizations
-- This migration fixes data fragmentation caused by duplicate organization names

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

-- Step 2: Define primary organizations (the ones with most data)
-- For Ashwani Kumar's Organization: f93788fa-0edd-496d-bd14-a35ece2f0fb5 (160 users, requests, properties)
-- For Manager User's Organization: 2f691249-e161-4fea-b27a-133302b63005 (8 properties, 4 requests)

-- Step 3: Consolidate "Ashwani Kumar's Organization" duplicates
-- Move data from ddaedf74-8893-40af-8039-24094f1a0551 to f93788fa-0edd-496d-bd14-a35ece2f0fb5

-- Update profiles
UPDATE profiles 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id = 'ddaedf74-8893-40af-8039-24094f1a0551';

-- Update session organization
UPDATE profiles 
SET session_organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE session_organization_id = 'ddaedf74-8893-40af-8039-24094f1a0551';

-- Update user organizations
UPDATE user_organizations 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id = 'ddaedf74-8893-40af-8039-24094f1a0551';

-- Update contractors
UPDATE contractors 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id = 'ddaedf74-8893-40af-8039-24094f1a0551';

-- Update maintenance requests
UPDATE maintenance_requests 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id = 'ddaedf74-8893-40af-8039-24094f1a0551';

-- Update quotes
UPDATE quotes 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id = 'ddaedf74-8893-40af-8039-24094f1a0551';

-- Update properties
UPDATE properties 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id = 'ddaedf74-8893-40af-8039-24094f1a0551';

-- Update notifications
UPDATE notifications 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id = 'ddaedf74-8893-40af-8039-24094f1a0551';

-- Update other related tables
UPDATE activity_logs 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id = 'ddaedf74-8893-40af-8039-24094f1a0551';

UPDATE invoices 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id = 'ddaedf74-8893-40af-8039-24094f1a0551';

-- Record consolidation for audit
INSERT INTO organization_consolidation_audit (
  original_org_id, target_org_id, org_name, consolidation_reason
) VALUES (
  'ddaedf74-8893-40af-8039-24094f1a0551',
  'f93788fa-0edd-496d-bd14-a35ece2f0fb5',
  'Ashwani Kumar''s Organization',
  'Consolidating duplicate organization - moving users and contractors from ddaedf74 to f93788fa (primary)'
);

-- Move data from 8f530443-3ab7-41e9-a353-9305dfd89332 to f93788fa-0edd-496d-bd14-a35ece2f0fb5
UPDATE profiles 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id = '8f530443-3ab7-41e9-a353-9305dfd89332';

UPDATE profiles 
SET session_organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE session_organization_id = '8f530443-3ab7-41e9-a353-9305dfd89332';

UPDATE user_organizations 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id = '8f530443-3ab7-41e9-a353-9305dfd89332';

UPDATE contractors 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id = '8f530443-3ab7-41e9-a353-9305dfd89332';

UPDATE maintenance_requests 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id = '8f530443-3ab7-41e9-a353-9305dfd89332';

-- Record consolidation
INSERT INTO organization_consolidation_audit (
  original_org_id, target_org_id, org_name, consolidation_reason
) VALUES (
  '8f530443-3ab7-41e9-a353-9305dfd89332',
  'f93788fa-0edd-496d-bd14-a35ece2f0fb5',
  'Ashwani Kumar''s Organization',
  'Consolidating duplicate organization - moving user and contractor from 8f5304 to f93788fa (primary)'
);

-- Move data from f7a06195-8697-4505-94f8-b75c4693a21a to f93788fa-0edd-496d-bd14-a35ece2f0fb5
UPDATE profiles 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id = 'f7a06195-8697-4505-94f8-b75c4693a21a';

UPDATE profiles 
SET session_organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE session_organization_id = 'f7a06195-8697-4505-94f8-b75c4693a21a';

UPDATE user_organizations 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id = 'f7a06195-8697-4505-94f8-b75c4693a21a';

UPDATE contractors 
SET organization_id = 'f93788fa-0edd-496d-bd14-a35ece2f0fb5'
WHERE organization_id = 'f7a06195-8697-4505-94f8-b75c4693a21a';

-- Record consolidation
INSERT INTO organization_consolidation_audit (
  original_org_id, target_org_id, org_name, consolidation_reason
) VALUES (
  'f7a06195-8697-4505-94f8-b75c4693a21a',
  'f93788fa-0edd-496d-bd14-a35ece2f0fb5',
  'Ashwani Kumar''s Organization',
  'Consolidating duplicate organization - moving user and contractor from f7a061 to f93788fa (primary)'
);

-- Step 4: Consolidate "Manager User's Organization" duplicates
-- Move data from 037bdf44-ee80-4459-ab58-34dfa25d720a to 2f691249-e161-4fea-b27a-133302b63005

UPDATE profiles 
SET organization_id = '2f691249-e161-4fea-b27a-133302b63005'
WHERE organization_id = '037bdf44-ee80-4459-ab58-34dfa25d720a';

UPDATE profiles 
SET session_organization_id = '2f691249-e161-4fea-b27a-133302b63005'
WHERE session_organization_id = '037bdf44-ee80-4459-ab58-34dfa25d720a';

UPDATE user_organizations 
SET organization_id = '2f691249-e161-4fea-b27a-133302b63005'
WHERE organization_id = '037bdf44-ee80-4459-ab58-34dfa25d720a';

-- Record consolidation
INSERT INTO organization_consolidation_audit (
  original_org_id, target_org_id, org_name, consolidation_reason
) VALUES (
  '037bdf44-ee80-4459-ab58-34dfa25d720a',
  '2f691249-e161-4fea-b27a-133302b63005',
  'Manager User''s Organization',
  'Consolidating duplicate organization - moving user from 037bdf to 2f6912 (primary)'
);

-- Step 5: Delete the now-empty duplicate organizations
DELETE FROM organizations 
WHERE id IN (
  'ddaedf74-8893-40af-8039-24094f1a0551',
  '8f530443-3ab7-41e9-a353-9305dfd89332', 
  'f7a06195-8697-4505-94f8-b75c4693a21a',
  '037bdf44-ee80-4459-ab58-34dfa25d720a'
);

-- Step 6: Add unique constraint to prevent future duplicate organization names
-- First check if constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_organization_name_per_created_by' 
    AND table_name = 'organizations'
  ) THEN
    -- Add unique constraint on (name, created_by) to prevent duplicates per creator
    ALTER TABLE organizations 
    ADD CONSTRAINT unique_organization_name_per_created_by 
    UNIQUE (name, created_by);
  END IF;
END $$;

-- Step 7: Update organization slugs to ensure uniqueness if needed
UPDATE organizations 
SET slug = LOWER(REGEXP_REPLACE(name || '_' || EXTRACT(EPOCH FROM created_at)::TEXT, '[^a-zA-Z0-9]', '_', 'g'))
WHERE slug IN (
  SELECT slug 
  FROM organizations 
  GROUP BY slug 
  HAVING COUNT(*) > 1
);

-- Add comments for documentation
COMMENT ON TABLE organization_consolidation_audit IS 'Audit trail for organization consolidation operations to fix duplicate organization issues';
COMMENT ON CONSTRAINT unique_organization_name_per_created_by ON organizations IS 'Prevents duplicate organization names for the same creator to avoid future data fragmentation';