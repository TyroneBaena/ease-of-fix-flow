-- Fix get_security_metrics to bypass RLS when querying security_events
-- The issue is that even though the function is SECURITY DEFINER,
-- the RLS policies on security_events are still being enforced

-- Drop and recreate the function to ensure it properly bypasses RLS
DROP FUNCTION IF EXISTS public.get_security_metrics(INTEGER, UUID);

CREATE OR REPLACE FUNCTION public.get_security_metrics(
  hours_back INTEGER DEFAULT 24,
  p_organization_id UUID DEFAULT NULL
)
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
  target_org_id UUID;
BEGIN
  -- Use provided org_id, or fall back to current user's org
  target_org_id := COALESCE(p_organization_id, public.get_current_user_organization_safe());
  
  IF target_org_id IS NULL THEN
    -- Return empty results if no organization context
    RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::BIGINT, '[]'::JSONB;
    RETURN;
  END IF;
  
  -- Query directly without RLS interference (function is SECURITY DEFINER)
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
    AND se.organization_id = target_org_id
    AND se.event_type IN ('login_success', 'login_failed');
END;
$$;