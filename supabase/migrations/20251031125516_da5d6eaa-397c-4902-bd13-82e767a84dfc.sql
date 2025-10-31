-- Fix the ambiguous column reference in list_organization_users function
CREATE OR REPLACE FUNCTION public.list_organization_users()
RETURNS TABLE (
  id uuid,
  name text,
  role text,
  created_at timestamptz,
  organization_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_org_id uuid;
  caller_role text;
BEGIN
  -- Get the caller's organization (using fully qualified column name)
  SELECT p.organization_id INTO caller_org_id
  FROM profiles p
  WHERE p.id = auth.uid();
  
  -- Get the caller's role
  SELECT ur.role::text INTO caller_role
  FROM user_roles ur
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
  
  -- Only admins and managers can list users
  IF caller_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Only admins and managers can list organization users';
  END IF;
  
  -- Return user list without PII
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    COALESCE(ur.role::text, 'user') as role,
    p.created_at,
    p.organization_id
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  WHERE p.organization_id = caller_org_id
  ORDER BY p.created_at DESC;
END;
$$;