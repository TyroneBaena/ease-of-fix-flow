-- Remove unused public access functions since we now require authentication for QR code access
-- These functions were used to bypass RLS for unauthenticated users

DROP FUNCTION IF EXISTS public.get_public_property_info(uuid);
DROP FUNCTION IF EXISTS public.get_public_property_requests(uuid, integer);
DROP FUNCTION IF EXISTS public.get_public_property_budget_categories(uuid);