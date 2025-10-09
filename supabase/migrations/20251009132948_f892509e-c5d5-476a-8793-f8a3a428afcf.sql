-- Phase 1: Add organization_id to security_events table
ALTER TABLE public.security_events 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Phase 2: Create indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_security_events_organization_id ON public.security_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at DESC);

-- Phase 3: Update log_security_event function to include organization context
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_id UUID;
  user_org_id UUID;
BEGIN
  -- Get organization_id from the authenticated user's profile
  IF p_user_id IS NOT NULL THEN
    SELECT organization_id INTO user_org_id
    FROM public.profiles
    WHERE id = p_user_id;
  END IF;
  
  -- If no user_id provided, try to get from current auth context
  IF user_org_id IS NULL AND auth.uid() IS NOT NULL THEN
    SELECT organization_id INTO user_org_id
    FROM public.profiles
    WHERE id = auth.uid();
  END IF;
  
  INSERT INTO public.security_events (
    event_type,
    user_id,
    user_email,
    ip_address,
    user_agent,
    session_id,
    metadata,
    organization_id
  ) VALUES (
    p_event_type,
    p_user_id,
    p_user_email,
    p_ip_address::INET,
    p_user_agent,
    p_session_id,
    p_metadata,
    user_org_id
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

-- Phase 4: Drop old function and create new organization-aware get_security_metrics
DROP FUNCTION IF EXISTS public.get_security_metrics(INTEGER);

CREATE FUNCTION public.get_security_metrics(hours_back INTEGER DEFAULT 24)
RETURNS TABLE(
  total_events BIGINT,
  failed_logins BIGINT,
  successful_logins BIGINT,
  unique_users BIGINT,
  recent_events JSONB
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_org_id UUID;
BEGIN
  -- Get current user's organization
  current_org_id := public.get_current_user_organization_safe();
  
  IF current_org_id IS NULL THEN
    -- Return empty results if no organization context
    RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::BIGINT, '[]'::JSONB;
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_events,
    COUNT(*) FILTER (WHERE event_type = 'login_failed')::BIGINT as failed_logins,
    COUNT(*) FILTER (WHERE event_type = 'login_success')::BIGINT as successful_logins,
    COUNT(DISTINCT user_id)::BIGINT as unique_users,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', se.id,
          'event_type', se.event_type,
          'user_email', se.user_email,
          'ip_address', se.ip_address,
          'created_at', se.created_at,
          'metadata', se.metadata
        ) ORDER BY se.created_at DESC
      ) FILTER (WHERE se.id IS NOT NULL),
      '[]'::jsonb
    ) as recent_events
  FROM public.security_events se
  WHERE se.created_at >= NOW() - (hours_back || ' hours')::INTERVAL
    AND se.organization_id = current_org_id -- CRITICAL: Organization filter
    AND se.event_type IN ('login_success', 'login_failed')
  LIMIT 1;
END;
$$;

-- Phase 5: Update RLS policies to enforce organization isolation
DROP POLICY IF EXISTS "Admins can view all security events" ON public.security_events;
DROP POLICY IF EXISTS "Users can view their own security events" ON public.security_events;

-- Admins can only view security events in their own organization
CREATE POLICY "Admins can view security events in their organization"
ON public.security_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.organization_id = security_events.organization_id
  )
);

-- Users can view their own security events (within their organization)
CREATE POLICY "Users can view their own security events"
ON public.security_events
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  AND organization_id = public.get_current_user_organization_safe()
);

-- Phase 6: Create helper function for debugging
CREATE OR REPLACE FUNCTION public.debug_current_user_for_security()
RETURNS TABLE(
  user_id UUID,
  user_email TEXT,
  user_role TEXT,
  is_authenticated BOOLEAN
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    auth.uid() as user_id,
    p.email as user_email,
    p.role as user_role,
    auth.uid() IS NOT NULL as is_authenticated
  FROM public.profiles p
  WHERE p.id = auth.uid();
END;
$$;

-- Add helpful comment
COMMENT ON COLUMN public.security_events.organization_id IS 'Organization context for multi-tenant security event isolation. NULL values are from before organization isolation was implemented.';