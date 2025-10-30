
-- Complete cascade deletion for user fcdd2127-aa9f-4da3-a2d2-151d5c174726

-- Step 1: Delete maintenance requests (they reference properties)
DELETE FROM maintenance_requests WHERE user_id = 'fcdd2127-aa9f-4da3-a2d2-151d5c174726';

-- Step 2: Delete properties
DELETE FROM properties WHERE user_id = 'fcdd2127-aa9f-4da3-a2d2-151d5c174726';

-- Step 3: Delete any remaining comments and notifications
DELETE FROM comments WHERE user_id = 'fcdd2127-aa9f-4da3-a2d2-151d5c174726';
DELETE FROM notifications WHERE user_id = 'fcdd2127-aa9f-4da3-a2d2-151d5c174726';

-- Step 4: Delete the auth user
DELETE FROM auth.users WHERE id = 'fcdd2127-aa9f-4da3-a2d2-151d5c174726';

DO $$
BEGIN
  RAISE NOTICE '✅ Successfully deleted user tyroneb@amsnsw.com and all associated data';
END $$;
