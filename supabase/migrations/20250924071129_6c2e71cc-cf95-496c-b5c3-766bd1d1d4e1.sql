-- Enable public read access for maintenance requests table
-- This allows QR code users to view existing maintenance requests for a property

CREATE POLICY "Public users can view maintenance requests for QR code access"
ON public.maintenance_requests
FOR SELECT
USING (true);