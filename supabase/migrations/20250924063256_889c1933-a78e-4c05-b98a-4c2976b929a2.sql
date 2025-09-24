-- Drop existing function and recreate with correct return type
DROP FUNCTION IF EXISTS public.validate_property_access_token(TEXT);

-- Create the validation function that the edge function calls
CREATE OR REPLACE FUNCTION public.validate_property_access_token(p_token TEXT)
RETURNS TABLE(
  is_valid BOOLEAN,
  property_id UUID,
  property_name TEXT,
  organization_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token_record RECORD;
BEGIN
  RAISE LOG 'Validating token: %', p_token;
  
  -- Get token details with property info
  SELECT 
    pat.property_id,
    pat.organization_id,
    pat.expires_at,
    p.name as property_name,
    (pat.expires_at > now()) as is_not_expired
  INTO token_record
  FROM public.property_access_tokens pat
  JOIN public.properties p ON pat.property_id = p.id
  WHERE pat.token = p_token;
  
  -- Check if token exists and is valid
  IF token_record IS NULL THEN
    RAISE LOG 'Token not found: %', p_token;
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if token is expired
  IF NOT token_record.is_not_expired THEN
    RAISE LOG 'Token expired: %', p_token;
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Token is valid
  RAISE LOG 'Token valid for property: % in organization: %', token_record.property_id, token_record.organization_id;
  
  RETURN QUERY SELECT 
    TRUE,
    token_record.property_id,
    token_record.property_name,
    token_record.organization_id;
END;
$$;