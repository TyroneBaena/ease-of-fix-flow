-- ============================================================
-- PHASE 3: AUTOMATED BILLING ENGINE - CRON SCHEDULING
-- ============================================================
-- This migration sets up automated daily trial conversion
-- ============================================================

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- SCHEDULED JOB: Auto-Convert Trials Daily at 2 AM UTC
-- ============================================================
-- This runs the auto-convert-trials edge function every day at 2 AM UTC
-- It will automatically convert expired trials to paid subscriptions

SELECT cron.schedule(
  'auto-convert-trials-daily',
  '0 2 * * *', -- Every day at 2:00 AM UTC
  $$
  SELECT
    net.http_post(
      url := 'https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/auto-convert-trials',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0amxzd3pyZGd0b2RkeXFteWRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDU0MDk5MiwiZXhwIjoyMDYwMTE2OTkyfQ.BLQ5g9hPWdNcWfSBALa5wE2_5qVdYJV7sQjfmUgV0t4'
      ),
      body := jsonb_build_object('scheduled', true)
    ) as request_id;
  $$
);

-- ============================================================
-- SCHEDULED JOB: Trial Reminders at 1 AM UTC
-- ============================================================
-- This runs the trial reminder check every day at 1 AM UTC
-- It will send reminder emails at 7, 3, and 1 day before trial expiry

SELECT cron.schedule(
  'check-trial-reminders-daily',
  '0 1 * * *', -- Every day at 1:00 AM UTC
  $$
  SELECT
    net.http_post(
      url := 'https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/check-trial-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0amxzd3pyZGd0b2RkeXFteWRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDU0MDk5MiwiZXhwIjoyMDYwMTE2OTkyfQ.BLQ5g9hPWdNcWfSBALa5wE2_5qVdYJV7sQjfmUgV0t4'
      ),
      body := jsonb_build_object('scheduled', true)
    ) as request_id;
  $$
);

-- ============================================================
-- VIEW SCHEDULED JOBS
-- ============================================================
-- Query to check scheduled jobs (for verification)
COMMENT ON EXTENSION pg_cron IS 'Phase 3: Automated billing cron jobs installed';

-- Log the installation
DO $$
BEGIN
  RAISE NOTICE 'Phase 3 Automated Billing Engine installed successfully';
  RAISE NOTICE 'Scheduled jobs:';
  RAISE NOTICE '  - auto-convert-trials-daily: Runs at 2 AM UTC';
  RAISE NOTICE '  - check-trial-reminders-daily: Runs at 1 AM UTC';
END $$;