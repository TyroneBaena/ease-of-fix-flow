-- Function to sync job schedules to calendar events
CREATE OR REPLACE FUNCTION public.sync_job_schedule_to_calendar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  request_record RECORD;
  scheduled_date RECORD;
  event_title TEXT;
  event_description TEXT;
BEGIN
  -- Handle DELETE - remove all calendar events for this job schedule
  IF TG_OP = 'DELETE' THEN
    DELETE FROM calendar_events 
    WHERE source_type = 'job_schedule' 
    AND source_id = OLD.id;
    
    RAISE LOG 'Deleted calendar events for job schedule: %', OLD.id;
    RETURN OLD;
  END IF;

  -- For INSERT or UPDATE, first delete existing calendar events for this schedule
  IF TG_OP = 'UPDATE' THEN
    DELETE FROM calendar_events 
    WHERE source_type = 'job_schedule' 
    AND source_id = OLD.id;
  END IF;

  -- Get the maintenance request details
  SELECT 
    mr.id,
    mr.title,
    mr.description,
    mr.property_id,
    mr.organization_id,
    COALESCE(p.name, '') as property_name
  INTO request_record
  FROM maintenance_requests mr
  LEFT JOIN properties p ON mr.property_id = p.id
  WHERE mr.id = NEW.request_id;

  IF request_record IS NULL THEN
    RAISE LOG 'Job schedule sync: Maintenance request not found for id: %', NEW.request_id;
    RETURN NEW;
  END IF;

  -- Build event title and description
  event_title := 'Job: ' || COALESCE(request_record.title, 'Scheduled Work');
  event_description := COALESCE(request_record.description, '');
  
  IF request_record.property_name != '' THEN
    event_description := event_description || E'\n\nProperty: ' || request_record.property_name;
  END IF;

  -- Loop through scheduled_dates JSON array and create calendar events
  FOR scheduled_date IN 
    SELECT 
      (value->>'date')::DATE as event_date,
      COALESCE(value->>'startTime', '09:00')::TIME as start_time,
      COALESCE(value->>'endTime', '17:00')::TIME as end_time
    FROM jsonb_array_elements(NEW.scheduled_dates)
  LOOP
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
    ) VALUES (
      NEW.organization_id,
      request_record.property_id,
      NEW.contractor_id,
      NEW.request_id,
      event_title,
      event_description,
      scheduled_date.event_date,
      scheduled_date.start_time,
      scheduled_date.end_time,
      'job_schedule',
      NEW.id,
      now(),
      now()
    );
    
    RAISE LOG 'Created calendar event for job schedule % on date %', NEW.id, scheduled_date.event_date;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create the trigger on job_schedules table
DROP TRIGGER IF EXISTS trigger_sync_job_schedule_to_calendar ON job_schedules;

CREATE TRIGGER trigger_sync_job_schedule_to_calendar
AFTER INSERT OR UPDATE OR DELETE ON job_schedules
FOR EACH ROW
EXECUTE FUNCTION sync_job_schedule_to_calendar();

-- Add index for better performance when querying by source
CREATE INDEX IF NOT EXISTS idx_calendar_events_source 
ON calendar_events(source_type, source_id);

-- Add index for contractor queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_contractor 
ON calendar_events(contractor_id, event_date);

-- Add index for property queries  
CREATE INDEX IF NOT EXISTS idx_calendar_events_property 
ON calendar_events(property_id, event_date);