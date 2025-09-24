-- Enable public read access for properties table
-- This allows QR code users to view basic property information without authentication

CREATE POLICY "Public users can view properties for QR code access"
ON public.properties
FOR SELECT
USING (true);