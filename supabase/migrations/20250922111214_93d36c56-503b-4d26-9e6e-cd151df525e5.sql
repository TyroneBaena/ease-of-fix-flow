-- Create a secure function to fetch basic property information for QR code access
-- This function runs with elevated privileges to bypass RLS for public QR code functionality
CREATE OR REPLACE FUNCTION public.get_public_property_info(property_uuid uuid)
RETURNS TABLE(
  id uuid,
  name text,
  address text,
  contact_number text,
  email text,
  practice_leader text,
  practice_leader_email text,
  practice_leader_phone text,
  rent_amount numeric,
  rent_period text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return basic property information for QR code access
  -- This bypasses RLS since it's marked as SECURITY DEFINER
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.address,
    p.contact_number,
    p.email,
    p.practice_leader,
    p.practice_leader_email,
    p.practice_leader_phone,
    p.rent_amount,
    p.rent_period,
    p.created_at
  FROM public.properties p
  WHERE p.id = property_uuid;
END;
$$;

-- Create a secure function to fetch recent maintenance requests for public property view
CREATE OR REPLACE FUNCTION public.get_public_property_requests(property_uuid uuid, request_limit integer DEFAULT 5)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  status text,
  priority text,
  location text,
  category text,
  created_at timestamp with time zone,
  issue_nature text,
  explanation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return limited maintenance request information for QR code access
  -- This bypasses RLS since it's marked as SECURITY DEFINER
  RETURN QUERY
  SELECT 
    mr.id,
    mr.title,
    mr.description,
    mr.status,
    mr.priority,
    mr.location,
    mr.category,
    mr.created_at,
    mr.issue_nature,
    mr.explanation
  FROM public.maintenance_requests mr
  WHERE mr.property_id = property_uuid
  ORDER BY mr.created_at DESC
  LIMIT request_limit;
END;
$$;

-- Log the creation of these functions
SELECT public.log_security_event(
  'public_qr_functions_created',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  jsonb_build_object(
    'functions_created', ARRAY['get_public_property_info', 'get_public_property_requests'],
    'purpose', 'Enable QR code property access without authentication',
    'security_level', 'limited_public_access'
  )
);