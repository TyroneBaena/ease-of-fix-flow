-- Remove all test/fake data, keep only real authentication events
DELETE FROM public.security_events 
WHERE user_email IN ('hacker@test.com', 'test@example.com', 'admin@example.com', 'user@company.com', 'unknown@domain.com', 'manager@organization.com', 'test@test.com');

-- Enable real-time updates for security_events table
ALTER TABLE public.security_events REPLICA IDENTITY FULL;

-- Add security_events to realtime publication so we get live updates
ALTER publication supabase_realtime ADD TABLE public.security_events;