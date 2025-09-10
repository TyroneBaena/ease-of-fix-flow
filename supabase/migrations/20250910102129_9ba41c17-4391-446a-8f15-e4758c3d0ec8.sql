-- Create a security definer function to insert activity logs that bypasses RLS
CREATE OR REPLACE FUNCTION public.insert_activity_log_secure(
  p_request_id UUID,
  p_action_type TEXT,
  p_description TEXT,
  p_actor_name TEXT DEFAULT NULL,
  p_actor_role TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_org_id UUID;
  new_log_id UUID;
BEGIN
  -- Get the organization_id from the maintenance request
  SELECT organization_id INTO request_org_id
  FROM maintenance_requests 
  WHERE id = p_request_id;
  
  IF request_org_id IS NULL THEN
    RAISE EXCEPTION 'Cannot find organization for request: %', p_request_id;
  END IF;
  
  -- Insert the activity log (this function runs as definer, bypassing RLS)
  INSERT INTO activity_logs (
    request_id,
    action_type,
    description,
    actor_name,
    actor_role,
    metadata,
    organization_id
  ) VALUES (
    p_request_id,
    p_action_type,
    p_description,
    p_actor_name,
    p_actor_role,
    p_metadata,
    request_org_id
  ) RETURNING id INTO new_log_id;
  
  RETURN new_log_id;
END;
$$;