-- Fix the function to only update - no need for test inserts
CREATE OR REPLACE FUNCTION public.get_security_metrics(hours_back integer DEFAULT 24)
RETURNS TABLE(total_events bigint, failed_logins bigint, successful_logins bigint, unique_users bigint, recent_events json)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  start_time TIMESTAMP WITH TIME ZONE;
  current_user_role TEXT;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM public.profiles 
  WHERE id = auth.uid();
  
  -- Only admins can see all security metrics, others see limited data
  IF current_user_role != 'admin' THEN
    RETURN QUERY
    SELECT 
      0::BIGINT as total_events,
      0::BIGINT as failed_logins,
      0::BIGINT as successful_logins,
      0::BIGINT as unique_users,
      '[]'::JSON as recent_events;
    RETURN;
  END IF;

  start_time := NOW() - (hours_back || ' hours')::INTERVAL;
  
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_events,
    COUNT(*) FILTER (WHERE event_type = 'login_failed')::BIGINT as failed_logins,
    COUNT(*) FILTER (WHERE event_type = 'login_success')::BIGINT as successful_logins,
    COUNT(DISTINCT user_id)::BIGINT as unique_users,
    COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', id,
          'event_type', event_type,
          'user_email', user_email,
          'ip_address', ip_address,
          'created_at', created_at,
          'metadata', metadata
        ) ORDER BY created_at DESC
      ) FILTER (WHERE created_at >= start_time),
      '[]'::JSON
    ) as recent_events
  FROM public.security_events
  WHERE created_at >= start_time;
END;
$$;

-- Insert some test authentication events with valid event types
INSERT INTO public.security_events (event_type, user_email, ip_address, user_agent, metadata) VALUES
('login_success', 'ostrich06762@mailshan.com', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '{"browser": "Chrome", "action": "dashboard_login"}'::jsonb),
('login_failed', 'hacker@test.com', '203.0.113.10', 'curl/7.68.0', '{"reason": "invalid_password", "attempts": 1}'::jsonb),
('login_success', 'ostrich06762@mailshan.com', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X)', '{"browser": "Safari", "action": "security_page_access"}'::jsonb);

-- Update timestamps to be recent
UPDATE public.security_events 
SET created_at = NOW() - (RANDOM() * INTERVAL '2 hours')
WHERE user_email IN ('ostrich06762@mailshan.com', 'hacker@test.com');