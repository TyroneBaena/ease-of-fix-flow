-- Function to safely delete a user and all their associated data
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_summary jsonb := '{}'::jsonb;
  deleted_count integer;
BEGIN
  -- Only admins can delete users
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- Delete from user_organizations
  DELETE FROM user_organizations WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_summary := jsonb_set(result_summary, '{user_organizations}', to_jsonb(deleted_count));

  -- Delete from user_roles
  DELETE FROM user_roles WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_summary := jsonb_set(result_summary, '{user_roles}', to_jsonb(deleted_count));

  -- Delete from notifications
  DELETE FROM notifications WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_summary := jsonb_set(result_summary, '{notifications}', to_jsonb(deleted_count));

  -- Delete from comments
  DELETE FROM comments WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_summary := jsonb_set(result_summary, '{comments}', to_jsonb(deleted_count));

  -- Delete from temporary_sessions
  DELETE FROM temporary_sessions WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_summary := jsonb_set(result_summary, '{temporary_sessions}', to_jsonb(deleted_count));

  -- Delete from security_events
  DELETE FROM security_events WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_summary := jsonb_set(result_summary, '{security_events}', to_jsonb(deleted_count));

  -- Delete from contractors
  DELETE FROM contractors WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_summary := jsonb_set(result_summary, '{contractors}', to_jsonb(deleted_count));

  -- Delete from subscribers
  DELETE FROM subscribers WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_summary := jsonb_set(result_summary, '{subscribers}', to_jsonb(deleted_count));

  -- Update maintenance_requests to NULL out user_id
  UPDATE maintenance_requests SET user_id = NULL WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_summary := jsonb_set(result_summary, '{maintenance_requests_nullified}', to_jsonb(deleted_count));

  -- Update properties to NULL out user_id
  UPDATE properties SET user_id = NULL WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_summary := jsonb_set(result_summary, '{properties_nullified}', to_jsonb(deleted_count));

  -- Delete profile (this should trigger auth.users cascade delete)
  DELETE FROM profiles WHERE id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_summary := jsonb_set(result_summary, '{profiles}', to_jsonb(deleted_count));

  -- Delete from auth.users using admin API
  DELETE FROM auth.users WHERE id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  result_summary := jsonb_set(result_summary, '{auth_users}', to_jsonb(deleted_count));

  result_summary := jsonb_set(result_summary, '{success}', to_jsonb(true));
  result_summary := jsonb_set(result_summary, '{user_id}', to_jsonb(target_user_id));

  RETURN result_summary;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'user_id', target_user_id
    );
END;
$$;