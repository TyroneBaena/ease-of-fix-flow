-- Enable public uploads for maintenance-files bucket for QR code access
-- We need to create policies that allow unauthenticated uploads

-- First, let's ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('maintenance-files', 'maintenance-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create policy to allow anyone to upload to maintenance-files bucket
-- This is needed for public QR code form submissions
CREATE POLICY "Public maintenance file uploads" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'maintenance-files');