-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create function to expire trials automatically
CREATE OR REPLACE FUNCTION expire_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update subscribers where trial has expired
  UPDATE subscribers
  SET 
    is_trial_active = false,
    updated_at = now()
  WHERE 
    is_trial_active = true 
    AND trial_end_date < now()
    AND is_cancelled = false;
    
  RAISE LOG 'Trial expiration check completed at %', now();
END;
$$;

-- Schedule the cron job to run every hour
SELECT cron.schedule(
  'expire-trials-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$SELECT expire_trials();$$
);

-- Create function to send trial expiration warnings (3 days before)
CREATE OR REPLACE FUNCTION send_trial_expiration_warnings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscriber_record RECORD;
  days_remaining INTEGER;
BEGIN
  -- Find trials expiring in 3 days
  FOR subscriber_record IN
    SELECT *
    FROM subscribers
    WHERE is_trial_active = true
    AND trial_end_date IS NOT NULL
    AND trial_end_date <= now() + interval '3 days'
    AND trial_end_date > now()
  LOOP
    -- Calculate days remaining
    days_remaining := EXTRACT(DAY FROM (subscriber_record.trial_end_date - now()));
    
    -- Log warning (in production, this would trigger an email)
    RAISE LOG 'Trial expiring for user % in % days', subscriber_record.email, days_remaining;
  END LOOP;
END;
$$;

-- Schedule warning emails to run daily at 9 AM
SELECT cron.schedule(
  'trial-expiration-warnings-daily',
  '0 9 * * *', -- Every day at 9 AM
  $$SELECT send_trial_expiration_warnings();$$
);