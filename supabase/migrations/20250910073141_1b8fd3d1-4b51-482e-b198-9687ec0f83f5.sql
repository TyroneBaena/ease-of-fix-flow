-- Fix missing profile for London Times contractor
-- This contractor exists but doesn't have a profile record, causing notification failures

INSERT INTO profiles (id, email, name, role, organization_id)
VALUES (
  '449a7fd0-860b-4fb8-870d-f772d56dc63d',
  'londontimes@contractor.com',
  'London Times Contractor',
  'contractor',
  '935b5c31-0cb3-4a4a-bf6a-6fbb7a109a12'
)
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  role = EXCLUDED.role,
  name = EXCLUDED.name;