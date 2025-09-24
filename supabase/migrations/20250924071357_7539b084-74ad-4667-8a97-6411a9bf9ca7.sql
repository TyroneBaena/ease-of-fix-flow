-- Remove the overly permissive public policy
DROP POLICY "Public users can view properties for QR code access" ON public.properties;

-- Remove the overly permissive maintenance requests policy too
DROP POLICY "Public users can view maintenance requests for QR code access" ON public.maintenance_requests;

-- Instead, we'll modify the PublicPropertyRequests page to use a service role function
-- that can safely access specific property data for QR code functionality