-- Fix pg_cron job configuration
-- Drop existing jobs and recreate them with proper settings

-- First, unschedule any existing jobs
SELECT cron.unschedule('auto-convert-expired-trials');
SELECT cron.unschedule('adjust-monthly-billing');
SELECT cron.unschedule('send-trial-reminders');

-- Recreate jobs with verified working configuration
-- Job 1: Auto-convert expired trials (Daily at 2:00 AM UTC)
SELECT cron.schedule(
  'auto-convert-expired-trials',
  '0 2 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/auto-convert-trials',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0amxzd3pyZGd0b2RkeXFteWRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDU0MDk5MiwiZXhwIjoyMDYwMTE2OTkyfQ.BLQ5g9hPWdNcWfSBALa5wE2_5qVdYJV7sQjfmUgV0t4"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Job 2: Adjust subscription billing (Monthly on 1st at 3:00 AM UTC)
SELECT cron.schedule(
  'adjust-monthly-billing',
  '0 3 1 * *',
  $$
  SELECT
    net.http_post(
        url:='https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/adjust-subscription-billing',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0amxzd3pyZGd0b2RkeXFteWRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDU0MDk5MiwiZXhwIjoyMDYwMTE2OTkyfQ.BLQ5g9hPWdNcWfSBALa5wE2_5qVdYJV7sQjfmUgV0t4"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Job 3: Send trial reminders (Daily at 10:00 AM UTC)
SELECT cron.schedule(
  'send-trial-reminders',
  '0 10 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/check-trial-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0amxzd3pyZGd0b2RkeXFteWRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDU0MDk5MiwiZXhwIjoyMDYwMTE2OTkyfQ.BLQ5g9hPWdNcWfSBALa5wE2_5qVdYJV7sQjfmUgV0t4"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Verify jobs are scheduled
SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobid;