-- Update storage policy to allow public uploads for QR code maintenance requests
-- This is necessary for the public maintenance request form accessed via QR codes

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;

-- Create a new policy that allows both authenticated and unauthenticated uploads
-- for the maintenance-files bucket (needed for QR code public access)
CREATE POLICY "Allow maintenance file uploads" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'maintenance-files');

-- Add logging for debugging
COMMENT ON POLICY "Allow maintenance file uploads" ON storage.objects IS 'Allows both authenticated and unauthenticated users to upload files to maintenance-files bucket for QR code public access';