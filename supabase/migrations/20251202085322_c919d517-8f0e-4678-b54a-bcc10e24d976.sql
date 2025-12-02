-- Create calendar_events table for custom events and job schedule sync
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  
  -- Event details
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Recurrence (NULL values = one-off event)
  recurrence_type TEXT CHECK (recurrence_type IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
  recurrence_end_date DATE,
  recurrence_days JSONB,  -- For weekly: which days [0-6], for monthly: day of month
  parent_event_id UUID REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  
  -- Source tracking
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'job_schedule', 'system')),
  source_id UUID,  -- Reference to job_schedules.id if source_type = 'job_schedule'
  
  -- Contractor tracking (for job_schedule events)
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
  maintenance_request_id UUID REFERENCES public.maintenance_requests(id) ON DELETE SET NULL,
  
  -- Metadata
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_calendar_events_organization_id ON public.calendar_events(organization_id);
CREATE INDEX idx_calendar_events_property_id ON public.calendar_events(property_id);
CREATE INDEX idx_calendar_events_event_date ON public.calendar_events(event_date);
CREATE INDEX idx_calendar_events_contractor_id ON public.calendar_events(contractor_id);
CREATE INDEX idx_calendar_events_source ON public.calendar_events(source_type, source_id);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage calendar events in their organization
CREATE POLICY "Users can manage calendar events in their organization"
  ON public.calendar_events FOR ALL
  USING (organization_id = get_current_user_organization_safe())
  WITH CHECK (organization_id = get_current_user_organization_safe());

-- RLS Policy: Contractors can view events they're assigned to
CREATE POLICY "Contractors can view their assigned events"
  ON public.calendar_events FOR SELECT
  USING (contractor_id = get_contractor_id());

-- Trigger to auto-update updated_at
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Function to sync job schedules to calendar events
CREATE OR REPLACE FUNCTION public.sync_job_schedule_to_calendar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  request_record RECORD;
  schedule_entry JSONB;
  event_date DATE;
  start_time TIME;
  end_time TIME;
BEGIN
  -- Get maintenance request details
  SELECT mr.*, p.name as property_name, p.id as prop_id, mr.organization_id as org_id
  INTO request_record
  FROM maintenance_requests mr
  LEFT JOIN properties p ON mr.property_id = p.id
  WHERE mr.id = NEW.request_id;

  IF request_record IS NULL THEN
    RETURN NEW;
  END IF;

  -- Delete existing calendar events for this job schedule (for updates)
  DELETE FROM calendar_events 
  WHERE source_type = 'job_schedule' AND source_id = NEW.id;

  -- Parse scheduled_dates JSON and create calendar events
  FOR schedule_entry IN SELECT * FROM jsonb_array_elements(NEW.scheduled_dates)
  LOOP
    -- Extract date and times from the schedule entry
    event_date := (schedule_entry->>'date')::DATE;
    start_time := COALESCE((schedule_entry->>'startTime')::TIME, '09:00'::TIME);
    end_time := COALESCE((schedule_entry->>'endTime')::TIME, '17:00'::TIME);

    -- Create calendar event
    INSERT INTO calendar_events (
      organization_id,
      property_id,
      title,
      description,
      event_date,
      start_time,
      end_time,
      source_type,
      source_id,
      contractor_id,
      maintenance_request_id,
      created_by
    ) VALUES (
      request_record.org_id,
      request_record.prop_id,
      'Scheduled: ' || COALESCE(request_record.title, 'Maintenance Work'),
      COALESCE(request_record.description, ''),
      event_date,
      start_time,
      end_time,
      'job_schedule',
      NEW.id,
      NEW.contractor_id,
      NEW.request_id,
      NEW.contractor_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger to sync job schedules
CREATE TRIGGER sync_job_schedule_to_calendar_trigger
  AFTER INSERT OR UPDATE ON public.job_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_job_schedule_to_calendar();

-- Function to clean up calendar events when job schedule is deleted
CREATE OR REPLACE FUNCTION public.delete_job_schedule_calendar_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM calendar_events 
  WHERE source_type = 'job_schedule' AND source_id = OLD.id;
  RETURN OLD;
END;
$$;

-- Trigger to clean up on job schedule delete
CREATE TRIGGER delete_job_schedule_calendar_events_trigger
  BEFORE DELETE ON public.job_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_job_schedule_calendar_events();