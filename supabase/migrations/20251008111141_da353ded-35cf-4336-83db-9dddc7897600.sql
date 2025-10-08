-- Create test cron jobs that run every minute to verify scheduler works
-- These will be removed after verification

-- Test job for auto-convert-trials (runs every minute)
SELECT cron.schedule(
  'test-auto-convert-every-minute',
  '* * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/auto-convert-trials',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0amxzd3pyZGd0b2RkeXFteWRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDU0MDk5MiwiZXhwIjoyMDYwMTE2OTkyfQ.BLQ5g9hPWdNcWfSBALa5wE2_5qVdYJV7sQjfmUgV0t4"}'::jsonb,
        body:=concat('{"time": "', now(), '", "source": "test-cron"}')::jsonb
    ) as request_id;
  $$
);

-- Test job for trial reminders (runs every minute)
SELECT cron.schedule(
  'test-trial-reminders-every-minute',
  '* * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/check-trial-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0amxzd3pyZGd0b2RkeXFteWRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDU0MDk5MiwiZXhwIjoyMDYwMTE2OTkyfQ.BLQ5g9hPWdNcWfSBALa5wE2_5qVdYJV7sQjfmUgV0t4"}'::jsonb,
        body:=concat('{"time": "', now(), '", "source": "test-cron"}')::jsonb
    ) as request_id;
  $$
);