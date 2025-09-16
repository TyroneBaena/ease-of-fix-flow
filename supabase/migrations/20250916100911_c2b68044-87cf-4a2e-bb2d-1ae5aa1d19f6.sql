-- Fix contractor organization membership issues
-- This addresses the bug where contractors were not getting proper organization memberships

-- Step 1: Update the profiles table to ensure contractor role is preserved
UPDATE profiles 
SET role = 'contractor'
WHERE id IN (
  SELECT DISTINCT c.user_id 
  FROM contractors c 
  WHERE c.user_id IS NOT NULL
)
AND role != 'contractor';

-- Step 2: Create missing user_organizations records for contractors
INSERT INTO user_organizations (user_id, organization_id, role, is_active, is_default)
SELECT DISTINCT 
  c.user_id,
  c.organization_id,
  'contractor' as role,
  true as is_active,
  true as is_default
FROM contractors c
WHERE c.user_id IS NOT NULL 
  AND c.organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_organizations uo 
    WHERE uo.user_id = c.user_id 
    AND uo.organization_id = c.organization_id
  );

-- Step 3: Update existing user_organizations records to have correct contractor role
UPDATE user_organizations 
SET role = 'contractor'
WHERE user_id IN (
  SELECT DISTINCT c.user_id 
  FROM contractors c 
  WHERE c.user_id IS NOT NULL
)
AND role != 'contractor';

-- Step 4: Ensure the specific user "Micheal" has the correct setup
-- Fix his organization membership in "john constructions"
INSERT INTO user_organizations (user_id, organization_id, role, is_active, is_default)
SELECT 
  '0d4400e8-f899-4e5e-b3ba-47db6fa331b7'::uuid,
  '395ee3e5-19ae-4475-aa1b-c3562774a3dd'::uuid,
  'contractor',
  true,
  false  -- Not default since he has another org
WHERE NOT EXISTS (
  SELECT 1 FROM user_organizations 
  WHERE user_id = '0d4400e8-f899-4e5e-b3ba-47db6fa331b7'::uuid 
  AND organization_id = '395ee3e5-19ae-4475-aa1b-c3562774a3dd'::uuid
);

-- Update his session to point to the john constructions organization
UPDATE profiles 
SET session_organization_id = '395ee3e5-19ae-4475-aa1b-c3562774a3dd'::uuid
WHERE id = '0d4400e8-f899-4e5e-b3ba-47db6fa331b7'::uuid;