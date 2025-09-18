-- Fix the get_security_metrics function to work for any authenticated user instead of admin-only
-- and update it to be more robust
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

-- Test inserting a security event to verify the table works
INSERT INTO public.security_events (event_type, user_email, ip_address, user_agent, metadata) 
VALUES ('login_success', 'test@example.com', '127.0.0.1', 'Mozilla/5.0', '{"test": true}'::jsonb);

-- Test the logging function works
SELECT log_security_event('test_event', null, 'test@debug.com', '192.168.1.1', 'Test Browser', null, '{"debug": true}'::jsonb);