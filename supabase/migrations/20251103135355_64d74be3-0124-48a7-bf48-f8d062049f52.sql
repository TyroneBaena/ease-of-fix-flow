-- Enable real-time for maintenance_requests table
-- This allows the frontend to receive live updates when requests are created/updated

-- First, ensure the table has REPLICA IDENTITY FULL for complete row data
ALTER TABLE public.maintenance_requests REPLICA IDENTITY FULL;

-- Add the table to the realtime publication so clients can subscribe to changes
-- This is what enables the real-time subscription in the frontend
DO $$
BEGIN
  -- Check if publication exists, if not it will be created automatically by Supabase
  -- We just need to add our table to it
  ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_requests;
EXCEPTION
  WHEN duplicate_object THEN
    -- Table already in publication, do nothing
    NULL;
END $$;