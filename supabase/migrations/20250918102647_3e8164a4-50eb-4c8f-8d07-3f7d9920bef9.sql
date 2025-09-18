-- Insert some test security events for demonstration
INSERT INTO public.security_events (event_type, user_email, ip_address, user_agent, metadata) VALUES
('login_success', 'admin@example.com', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', '{"browser": "Chrome", "version": "120"}'),
('login_failed', 'hacker@example.com', '203.0.113.10', 'curl/7.68.0', '{"reason": "invalid_password", "attempts": 3}'),
('login_success', 'user@company.com', '10.0.0.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', '{"browser": "Safari", "version": "16"}'),
('login_failed', 'unknown@domain.com', '198.51.100.25', 'Python-requests/2.28.1', '{"reason": "user_not_found"}'),
('login_success', 'manager@organization.com', '172.16.0.10', 'Mozilla/5.0 (X11; Linux x86_64)', '{"browser": "Firefox", "version": "110"}'),
('login_failed', 'test@test.com', '203.0.113.15', 'wget/1.20.3', '{"reason": "account_locked", "attempts": 5}');

-- Update timestamps to be within the last 24 hours
UPDATE public.security_events 
SET created_at = NOW() - (RANDOM() * INTERVAL '23 hours');

-- Log that test data was inserted
INSERT INTO public.security_events (event_type, user_email, ip_address, metadata) VALUES
('system_event', 'system@admin', '127.0.0.1', '{"action": "test_data_inserted", "timestamp": "' || NOW() || '"}');