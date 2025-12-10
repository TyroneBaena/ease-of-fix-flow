-- Schedule daily pending request reminders at 9 AM UTC (7 PM AEST)
SELECT cron.schedule(
  'send-pending-request-reminders-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/send-pending-request-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0amxzd3pyZGd0b2RkeXFteWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1NDA5OTIsImV4cCI6MjA2MDExNjk5Mn0.YXg-x4oflJUdoRdQQGI2NisUqUVHAXkhgyrr-4CoE0'
    ),
    body := jsonb_build_object('scheduled', true, 'timestamp', now())
  ) as request_id;
  $$
);