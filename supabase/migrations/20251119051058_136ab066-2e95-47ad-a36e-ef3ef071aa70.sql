
-- One-time cleanup for user goyalsunny19986@gmail.com (02f96cae-50c7-4fd5-9ae2-4b482ef552c9)

DO $$
DECLARE
  target_user_id uuid := '02f96cae-50c7-4fd5-9ae2-4b482ef552c9';
  target_org_id uuid := '1e485666-c4c2-4704-bc6e-03d308e266d5';
BEGIN
  -- Delete subscriber record first
  DELETE FROM subscribers WHERE user_id = target_user_id;
  
  -- Delete properties (cascades to maintenance_requests, budgets, etc.)
  DELETE FROM properties WHERE user_id = target_user_id;
  
  -- Delete organization (cascades to related data)
  DELETE FROM organizations WHERE id = target_org_id;
  
  -- Delete profiles (cascades to most other tables)
  DELETE FROM profiles WHERE id = target_user_id;
  
  -- Delete user_organizations
  DELETE FROM user_organizations WHERE user_id = target_user_id;
  
  -- Delete user_roles
  DELETE FROM user_roles WHERE user_id = target_user_id;
  
  RAISE NOTICE 'Successfully cleaned up all data for user %', target_user_id;
END $$;
