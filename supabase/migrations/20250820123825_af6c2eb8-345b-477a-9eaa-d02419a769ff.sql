-- Enable realtime for maintenance_requests table
ALTER TABLE maintenance_requests REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_requests;