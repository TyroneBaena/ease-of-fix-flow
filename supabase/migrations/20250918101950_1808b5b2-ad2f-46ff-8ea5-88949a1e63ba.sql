-- Create security_events table for tracking authentication and security events
CREATE TABLE public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('login_success', 'login_failed', 'logout', 'password_reset', 'account_locked')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX idx_security_events_event_type ON public.security_events(event_type);
CREATE INDEX idx_security_events_created_at ON public.security_events(created_at);
CREATE INDEX idx_security_events_user_email ON public.security_events(user_email);

-- Enable RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can see all security events
CREATE POLICY "Admins can view all security events" 
  ON public.security_events 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Users can only see their own security events
CREATE POLICY "Users can view their own security events" 
  ON public.security_events 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Only system can insert security events (via service role)
CREATE POLICY "System can insert security events" 
  ON public.security_events 
  FOR INSERT 
  WITH CHECK (true);

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.security_events (
    event_type,
    user_id,
    user_email,
    ip_address,
    user_agent,
    session_id,
    metadata
  ) VALUES (
    p_event_type,
    p_user_id,
    p_user_email,
    p_ip_address::INET,
    p_user_agent,
    p_session_id,
    p_metadata
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

-- Create function to get security metrics for admins
CREATE OR REPLACE FUNCTION public.get_security_metrics(
  hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
  total_events BIGINT,
  failed_logins BIGINT,
  successful_logins BIGINT,
  unique_users BIGINT,
  recent_events JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
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