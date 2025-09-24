-- Create the function to generate property access tokens
CREATE OR REPLACE FUNCTION public.generate_property_access_token(
  p_property_id UUID,
  p_expires_hours INTEGER DEFAULT 6
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_token TEXT;
  current_org_id UUID;
BEGIN
  -- Get current user's organization
  current_org_id := public.get_current_user_organization_safe();
  
  IF current_org_id IS NULL THEN
    RAISE EXCEPTION 'User must belong to an organization to generate tokens';
  END IF;
  
  -- Verify user has access to the property
  IF NOT EXISTS (
    SELECT 1 FROM properties 
    WHERE id = p_property_id 
    AND organization_id = current_org_id
  ) THEN
    RAISE EXCEPTION 'Property not found or access denied';
  END IF;
  
  -- Generate a random token (using gen_random_uuid and extracting characters)
  new_token := REPLACE(gen_random_uuid()::TEXT, '-', '') || 
               REPLACE(gen_random_uuid()::TEXT, '-', '');
  
  -- Insert the token record
  INSERT INTO public.property_access_tokens (
    token,
    property_id,
    organization_id,
    expires_at,
    created_by
  ) VALUES (
    new_token,
    p_property_id,
    current_org_id,
    NOW() + (p_expires_hours || ' hours')::INTERVAL,
    auth.uid()
  );
  
  RETURN new_token;
END;
$$;