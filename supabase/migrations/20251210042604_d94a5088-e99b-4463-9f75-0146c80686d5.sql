-- Add notification_sent column to calendar_events table
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS notification_sent boolean DEFAULT false;

-- Create index for efficient querying of events needing reminders
CREATE INDEX IF NOT EXISTS idx_calendar_events_reminder_query 
ON calendar_events(event_date, notification_sent) 
WHERE notification_sent = false AND property_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN calendar_events.notification_sent IS 'Tracks whether a reminder notification has been sent for this event (1 business day before)';