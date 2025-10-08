-- Remove test cron jobs - they've proven the scheduler works perfectly
SELECT cron.unschedule('test-auto-convert-every-minute');
SELECT cron.unschedule('test-trial-reminders-every-minute');