-- Backfill existing job_schedules to calendar_events
-- This ensures all scheduled jobs appear in site, contractor, and org calendars

INSERT INTO calendar_events (
  organization_id, 
  property_id, 
  contractor_id, 
  maintenance_request_id,
  title, 
  description, 
  event_date, 
  start_time, 
  end_time,
  source_type, 
  source_id, 
  created_at, 
  updated_at
)
SELECT 
  js.organization_id,
  mr.property_id,
  js.contractor_id,
  js.request_id,
  'Job: ' || COALESCE(mr.title, 'Scheduled Work'),
  mr.description,
  (sd.value->>'date')::DATE,
  COALESCE(sd.value->>'startTime', '09:00')::TIME,
  COALESCE(sd.value->>'endTime', '17:00')::TIME,
  'job_schedule',
  js.id,
  js.created_at,
  now()
FROM job_schedules js
CROSS JOIN LATERAL jsonb_array_elements(js.scheduled_dates) AS sd(value)
LEFT JOIN maintenance_requests mr ON js.request_id = mr.id
WHERE js.organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM calendar_events ce 
    WHERE ce.source_type = 'job_schedule' 
    AND ce.source_id = js.id
    AND ce.event_date = (sd.value->>'date')::DATE
  );