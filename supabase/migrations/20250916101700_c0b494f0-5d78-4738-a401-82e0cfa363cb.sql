-- Fix the organization context for contractor Micheal
-- The user should be in the organization where they work as a contractor

-- First, let's set the correct default organization for the user
-- The user should primarily be in "john constructions" where they work as contractor
UPDATE user_organizations 
SET is_default = false 
WHERE user_id = '0d4400e8-f899-4e5e-b3ba-47db6fa331b7'::uuid;

-- Set "john constructions" as the default organization since that's where they work as contractor
UPDATE user_organizations 
SET is_default = true 
WHERE user_id = '0d4400e8-f899-4e5e-b3ba-47db6fa331b7'::uuid
AND organization_id = '395ee3e5-19ae-4475-aa1b-c3562774a3dd'::uuid;

-- Update the user's session to be in the correct organization
UPDATE profiles 
SET session_organization_id = '395ee3e5-19ae-4475-aa1b-c3562774a3dd'::uuid,
    organization_id = '395ee3e5-19ae-4475-aa1b-c3562774a3dd'::uuid
WHERE id = '0d4400e8-f899-4e5e-b3ba-47db6fa331b7'::uuid;