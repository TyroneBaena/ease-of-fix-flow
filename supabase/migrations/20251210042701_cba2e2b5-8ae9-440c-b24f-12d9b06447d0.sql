-- Schedule cron job to run daily at 9am for calendar event reminders
SELECT cron.schedule(
  'send-calendar-event-reminders-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/send-calendar-event-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0amxzd3pyZGd0b2RkeXFteWRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDU0MDk5MiwiZXhwIjoyMDYwMTE2OTkyfQ.BLQ5g9hPWdNcWfSBALa5wE2_5qVdYJV7sQjfmUgV0t4'
    ),
    body := jsonb_build_object('scheduled', true)
  ) as request_id;
  $$
);