-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the auto-convert-trials function to run daily at midnight UTC
SELECT cron.schedule(
  'auto-convert-expiring-trials',
  '0 0 * * *', -- Every day at midnight
  $$
  SELECT net.http_post(
    url := 'https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/auto-convert-trials',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0amxzd3pyZGd0b2RkeXFteWRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDU0MDk5MiwiZXhwIjoyMDYwMTE2OTkyfQ.BLQ5g9hPWdNcWfSBALa5wE2_5qVdYJV7sQjfmUgV0t4"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Add index for faster trial expiration queries
CREATE INDEX IF NOT EXISTS idx_subscribers_trial_expiration 
ON subscribers(trial_end_date, is_trial_active, subscribed) 
WHERE is_trial_active = true AND subscribed = false;

-- Add index for property count queries
CREATE INDEX IF NOT EXISTS idx_properties_user_id 
ON properties(user_id);
