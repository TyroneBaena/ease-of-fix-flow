
-- Clean deletion of user tyroneb@amsnsw.com and all associated data
-- User ID: fcdd2127-aa9f-4da3-a2d2-151d5c174726
-- Organization ID: e49e1404-caab-42d0-afc2-985fb9ac4db2

-- Step 1: Delete subscriber record
DELETE FROM subscribers 
WHERE organization_id = 'e49e1404-caab-42d0-afc2-985fb9ac4db2';

-- Step 2: Delete user_organizations record
DELETE FROM user_organizations 
WHERE organization_id = 'e49e1404-caab-42d0-afc2-985fb9ac4db2';

-- Step 3: Delete organization
DELETE FROM organizations 
WHERE id = 'e49e1404-caab-42d0-afc2-985fb9ac4db2';

-- Step 4: Delete profile (the auth.users deletion will need to be done separately)
DELETE FROM profiles 
WHERE id = 'fcdd2127-aa9f-4da3-a2d2-151d5c174726';

-- Log the cleanup
DO $$
BEGIN
  RAISE NOTICE 'Successfully deleted user tyroneb@amsnsw.com and all associated data';
  RAISE NOTICE 'Organization e49e1404-caab-42d0-afc2-985fb9ac4db2 removed';
  RAISE NOTICE 'User fcdd2127-aa9f-4da3-a2d2-151d5c174726 profile removed';
  RAISE NOTICE 'NOTE: Auth user must be deleted manually from Supabase Dashboard';
END $$;
