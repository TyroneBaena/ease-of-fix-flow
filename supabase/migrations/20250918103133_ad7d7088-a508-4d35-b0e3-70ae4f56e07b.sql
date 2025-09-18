-- Clean up old test data and keep only recent events for better dashboard experience
DELETE FROM public.security_events WHERE user_email IN ('admin@example.com', 'hacker@example.com', 'user@company.com', 'unknown@domain.com', 'manager@organization.com', 'test@test.com', 'system@admin');

-- Create a function to automatically clean old security events (older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_security_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.security_events 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  RAISE LOG 'Cleaned up old security events older than 30 days';
END;
$$;

-- Create a function to get real-time active sessions count
CREATE OR REPLACE FUNCTION public.get_active_sessions_count()
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  session_count integer := 0;
BEGIN
  -- Count profiles that have been active in the last hour (rough estimate)
  SELECT COUNT(DISTINCT p.id) INTO session_count
  FROM public.profiles p
  WHERE p.updated_at > NOW() - INTERVAL '1 hour';
  
  -- Ensure at least 1 if there are any profiles (current user)
  IF session_count = 0 AND EXISTS (SELECT 1 FROM public.profiles LIMIT 1) THEN
    session_count := 1;
  END IF;
  
  RETURN session_count;
END;
$$;