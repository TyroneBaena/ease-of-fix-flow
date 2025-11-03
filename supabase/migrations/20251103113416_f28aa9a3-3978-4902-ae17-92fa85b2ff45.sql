-- Enable realtime for maintenance_requests table
ALTER TABLE maintenance_requests REPLICA IDENTITY FULL;

-- Check if already in publication, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'maintenance_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_requests;
  END IF;
END $$;