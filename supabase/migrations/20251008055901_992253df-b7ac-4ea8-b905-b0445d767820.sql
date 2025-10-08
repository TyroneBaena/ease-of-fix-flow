-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to auto-convert expired trials daily at 2 AM
SELECT cron.schedule(
  'auto-convert-expired-trials',
  '0 2 * * *', -- Every day at 2 AM
  $$
  SELECT
    net.http_post(
        url:='https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/auto-convert-trials',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0amxzd3pyZGd0b2RkeXFteWRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDU0MDk5MiwiZXhwIjoyMDYwMTE2OTkyfQ.BLQ5g9hPWdNcWfSBALa5wE2_5qVdYJV7sQjfmUgV0t4"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Create cron job to adjust subscription billing monthly on the 1st at 3 AM
SELECT cron.schedule(
  'adjust-monthly-billing',
  '0 3 1 * *', -- First day of every month at 3 AM
  $$
  SELECT
    net.http_post(
        url:='https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/adjust-subscription-billing',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0amxzd3pyZGd0b2RkeXFteWRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDU0MDk5MiwiZXhwIjoyMDYwMTE2OTkyfQ.BLQ5g9hPWdNcWfSBALa5wE2_5qVdYJV7sQjfmUgV0t4"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Create cron job to continue checking trial reminders daily at 10 AM
SELECT cron.schedule(
  'send-trial-reminders',
  '0 10 * * *', -- Every day at 10 AM
  $$
  SELECT
    net.http_post(
        url:='https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/check-trial-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0amxzd3pyZGd0b2RkeXFteWRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDU0MDk5MiwiZXhwIjoyMDYwMTE2OTkyfQ.BLQ5g9hPWdNcWfSBALa5wE2_5qVdYJV7sQjfmUgV0t4"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Add comments for documentation
COMMENT ON EXTENSION pg_cron IS 'Phase 2: Enables scheduled tasks for automated trial conversion and billing adjustments';
