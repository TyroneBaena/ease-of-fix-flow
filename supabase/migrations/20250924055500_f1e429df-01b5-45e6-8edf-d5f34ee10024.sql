-- Create table for one-time property access tokens
CREATE TABLE public.property_access_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.profiles(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for temporary user sessions
CREATE TABLE public.temporary_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_token TEXT NOT NULL UNIQUE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  user_id UUID REFERENCES public.profiles(id), -- null for temporary, set when claimed
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temporary_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for property_access_tokens
CREATE POLICY "Admin users can manage property access tokens"
ON public.property_access_tokens
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.organization_id = property_access_tokens.organization_id
  )
);

-- RLS policies for temporary_sessions
CREATE POLICY "Users can access their own temporary sessions"
ON public.temporary_sessions
FOR ALL
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.organization_id = temporary_sessions.organization_id
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_property_access_tokens_updated_at
  BEFORE UPDATE ON public.property_access_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_temporary_sessions_updated_at
  BEFORE UPDATE ON public.temporary_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Function to generate property access token
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
BEGIN
  -- Get property organization
  SELECT organization_id INTO property_org_id
  FROM public.properties
  WHERE id = p_property_id;
  
  IF property_org_id IS NULL THEN
    RAISE EXCEPTION 'Property not found';
  END IF;
  
  -- Verify user has admin access to property's organization
  SELECT organization_id INTO current_user_org_id
  FROM public.profiles
  WHERE id = auth.uid() AND role = 'admin';
  
  IF current_user_org_id IS NULL OR current_user_org_id != property_org_id THEN
    RAISE EXCEPTION 'Access denied: admin access required';
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

-- Function to validate and consume access token
CREATE OR REPLACE FUNCTION public.validate_property_access_token(p_token TEXT)
RETURNS TABLE(
  property_id UUID,
  organization_id UUID,
  property_name TEXT,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token_record RECORD;
  prop_name TEXT;
BEGIN
  -- Get token details
  SELECT pat.property_id, pat.organization_id, pat.expires_at, pat.used_at
  INTO token_record
  FROM public.property_access_tokens pat
  WHERE pat.token = p_token;
  
  -- Check if token exists and is valid
  IF token_record IS NULL OR 
     token_record.used_at IS NOT NULL OR 
     token_record.expires_at < now() THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::TEXT, false;
    RETURN;
  END IF;
  
  -- Mark token as used
  UPDATE public.property_access_tokens
  SET used_at = now(), updated_at = now()
  WHERE token = p_token;
  
  -- Get property name
  SELECT name INTO prop_name
  FROM public.properties
  WHERE id = token_record.property_id;
  
  -- Return valid token data
  RETURN QUERY SELECT 
    token_record.property_id,
    token_record.organization_id,
    COALESCE(prop_name, 'Unknown Property'),
    true;
END;
$$;