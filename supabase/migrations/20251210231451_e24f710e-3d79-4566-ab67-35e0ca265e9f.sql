-- Add last_reminder_sent_at column to track when reminders were sent
ALTER TABLE public.maintenance_requests 
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient querying of pending requests needing reminders
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_reminder_status 
ON public.maintenance_requests (status, created_at, last_reminder_sent_at)
WHERE status IN ('pending', 'open');

-- Comment for documentation
COMMENT ON COLUMN public.maintenance_requests.last_reminder_sent_at IS 'Timestamp of when the last pending reminder email was sent for this request';