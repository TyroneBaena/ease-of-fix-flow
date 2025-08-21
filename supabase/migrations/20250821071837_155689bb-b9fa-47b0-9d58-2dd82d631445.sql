-- Fix contractor data integrity by properly handling foreign key references

-- Step 1: Create the missing contractor profile for contractor@test.com user first
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

-- Step 2: Now assign a test task to this contractor so they have something to see
UPDATE public.maintenance_requests 
SET contractor_id = (
    SELECT id FROM public.contractors 
    WHERE user_id = '8325054d-a806-4642-90c7-f15195cb566b'
)
WHERE id = (
    SELECT id FROM public.maintenance_requests 
    WHERE contractor_id IS NULL 
    AND quote_requested = true 
    LIMIT 1
);

-- Step 3: Add unique constraint (only if it doesn't exist)
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE public.contractors 
        ADD CONSTRAINT contractors_user_id_unique UNIQUE (user_id);
    EXCEPTION
        WHEN duplicate_table THEN
            -- Constraint already exists, do nothing
        WHEN others THEN
            RAISE;
    END;
END $$;

-- Step 4: Create index for performance
CREATE INDEX IF NOT EXISTS idx_contractors_user_id ON public.contractors(user_id);

-- Step 5: Update the get_contractor_id function to be more robust
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