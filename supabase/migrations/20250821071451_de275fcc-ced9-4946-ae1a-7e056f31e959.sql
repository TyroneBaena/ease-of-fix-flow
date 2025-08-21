-- Fix the contractor workflow by creating the missing contractor profile
-- and ensuring proper data integrity

-- First, create the missing contractor profile for contractor@test.com
INSERT INTO public.contractors (
    user_id,
    company_name,
    contact_name,
    email,
    phone,
    address,
    specialties
) VALUES (
    '8325054d-a806-4642-90c7-f15195cb566b',
    'Test Contractor Company',
    'Contractor User',
    'contractor@test.com',
    '555-0100',
    '123 Test Address',
    ARRAY['General Maintenance', 'Plumbing', 'Electrical']
);

-- Clean up orphaned contractor profiles that don't have matching auth users
-- First check which user_ids in contractors table don't exist in auth.users
-- We'll update the existing "Test" contractor to use the correct user_id
UPDATE public.contractors 
SET user_id = '8325054d-a806-4642-90c7-f15195cb566b'
WHERE company_name = 'Test' 
AND contact_name = 'contractor' 
AND email = 'contractor@test.com';

-- Ensure we don't have duplicate contractors for the same user
DELETE FROM public.contractors 
WHERE id = '8bb6802b-060f-4650-abf5-68107d30ecce' 
AND user_id != '8325054d-a806-4642-90c7-f15195cb566b';

-- Add a unique constraint to prevent future data integrity issues
ALTER TABLE public.contractors 
ADD CONSTRAINT contractors_user_id_unique UNIQUE (user_id);

-- Create an index for better performance on contractor lookups
CREATE INDEX IF NOT EXISTS idx_contractors_user_id ON public.contractors(user_id);

-- Update the get_contractor_id function to be more robust
CREATE OR REPLACE FUNCTION public.get_contractor_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
  contractor_uuid uuid;
BEGIN
  -- Get contractor ID for current authenticated user
  SELECT id INTO contractor_uuid
  FROM public.contractors
  WHERE user_id = auth.uid()
  LIMIT 1; -- Ensure we only get one result
  
  RETURN contractor_uuid;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and return NULL
    RAISE LOG 'Error in get_contractor_id for user %: %', auth.uid(), SQLERRM;
    RETURN NULL;
END;
$function$;