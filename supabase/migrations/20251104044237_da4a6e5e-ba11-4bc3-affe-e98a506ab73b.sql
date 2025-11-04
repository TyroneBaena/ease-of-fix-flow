
-- Delete organization and all related data for tyroneb@amsnsw.com
-- Organization ID: 5a38e19a-2348-4a08-a574-343a58fc28d8

DO $$
DECLARE
  org_id_to_delete UUID := '5a38e19a-2348-4a08-a574-343a58fc28d8';
  deleted_count INTEGER;
BEGIN
  RAISE NOTICE 'Starting deletion of organization: %', org_id_to_delete;
  
  -- Delete properties
  DELETE FROM properties WHERE organization_id = org_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % properties', deleted_count;
  
  -- Delete maintenance requests
  DELETE FROM maintenance_requests WHERE organization_id = org_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % maintenance requests', deleted_count;
  
  -- Delete contractors
  DELETE FROM contractors WHERE organization_id = org_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % contractors', deleted_count;
  
  -- Delete landlords
  DELETE FROM landlords WHERE organization_id = org_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % landlords', deleted_count;
  
  -- Delete budget categories
  DELETE FROM budget_categories WHERE organization_id = org_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % budget categories', deleted_count;
  
  -- Delete property budgets
  DELETE FROM property_budgets WHERE organization_id = org_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % property budgets', deleted_count;
  
  -- Delete activity logs
  DELETE FROM activity_logs WHERE organization_id = org_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % activity logs', deleted_count;
  
  -- Delete comments
  DELETE FROM comments WHERE organization_id = org_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % comments', deleted_count;
  
  -- Delete notifications
  DELETE FROM notifications WHERE organization_id = org_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % notifications', deleted_count;
  
  -- Delete subscribers
  DELETE FROM subscribers WHERE organization_id = org_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % subscribers', deleted_count;
  
  -- Delete app settings
  DELETE FROM app_settings WHERE organization_id = org_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % app settings', deleted_count;
  
  -- Delete user organization memberships
  DELETE FROM user_organizations WHERE organization_id = org_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % user organization memberships', deleted_count;
  
  -- Finally, delete the organization itself
  DELETE FROM organizations WHERE id = org_id_to_delete;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % organization record', deleted_count;
  
  RAISE NOTICE 'Successfully deleted organization: Australian Mentoring Services NSW';
END $$;
