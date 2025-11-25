-- Enable Realtime for profiles table to support live profile updates
-- This allows UnifiedAuthProvider to listen for profile changes and update currentUser automatically

-- Set REPLICA IDENTITY FULL to ensure complete row data is sent in realtime updates
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Add profiles table to the realtime publication so changes are broadcast
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;