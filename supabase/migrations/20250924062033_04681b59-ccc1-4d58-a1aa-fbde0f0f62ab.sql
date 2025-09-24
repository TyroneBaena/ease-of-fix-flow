-- Fix the token generation function to work with proper organization access
CREATE OR REPLACE FUNCTION public.generate_property_access_token(
  p_property_id UUID,
  p_expires_hours INTEGER DEFAULT 24
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_token TEXT;
  property_org_id UUID;
  current_user_org_id UUID;
  current_user_role TEXT;
BEGIN
  -- Get property organization
  SELECT organization_id INTO property_org_id
  FROM public.properties
  WHERE id = p_property_id;
  
  IF property_org_id IS NULL THEN
    RAISE EXCEPTION 'Property not found';
  END IF;
  
  -- Get current user info
  SELECT organization_id, role INTO current_user_org_id, current_user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Check if user has access to this property's organization
  IF current_user_org_id IS NULL THEN
    RAISE EXCEPTION 'User must belong to an organization';
  END IF;
  
  IF current_user_org_id != property_org_id THEN
    RAISE EXCEPTION 'Access denied: user does not have access to this property';
  END IF;
  
  -- Admins can always generate tokens, managers can only if they have property access
  IF current_user_role != 'admin' THEN
    -- Check if manager has access to this specific property
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR p_property_id::text = ANY(assigned_properties))
    ) THEN
      RAISE EXCEPTION 'Access denied: insufficient permissions for this property';
    END IF;
  END IF;
  
  -- Generate unique token
  new_token := encode(gen_random_bytes(32), 'base64url');
  
  -- Insert token
  INSERT INTO public.property_access_tokens (
    property_id,
    token,
    expires_at,
    created_by,
    organization_id
  ) VALUES (
    p_property_id,
    new_token,
    now() + (p_expires_hours || ' hours')::INTERVAL,
    auth.uid(),
    property_org_id
  );
  
  RETURN new_token;
END;
$$;