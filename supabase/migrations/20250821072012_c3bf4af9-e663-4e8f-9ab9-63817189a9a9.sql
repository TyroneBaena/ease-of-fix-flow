-- Approach: Instead of deleting, let's consolidate and fix the data

-- Step 1: Create the missing contractor profile for contractor@test.com user
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

-- Step 2: Get the new contractor ID and assign them a task
DO $$
DECLARE
    new_contractor_id uuid;
    sample_request_id uuid;
BEGIN
    -- Get the newly created contractor ID
    SELECT id INTO new_contractor_id 
    FROM public.contractors 
    WHERE user_id = '8325054d-a806-4642-90c7-f15195cb566b';
    
    -- Find a maintenance request that needs quote or assignment
    SELECT id INTO sample_request_id
    FROM public.maintenance_requests 
    WHERE (contractor_id IS NULL AND quote_requested = true)
       OR status = 'pending'
    LIMIT 1;
    
    -- Assign the request to our test contractor
    IF sample_request_id IS NOT NULL THEN
        UPDATE public.maintenance_requests 
        SET contractor_id = new_contractor_id,
            status = 'in-progress',
            assigned_at = now(),
            quote_requested = true
        WHERE id = sample_request_id;
    END IF;
END $$;

-- Step 3: Create better RLS policies for contractor access
DROP POLICY IF EXISTS "contractors_select_own" ON public.contractors;

CREATE POLICY "contractors_select_own" ON public.contractors
FOR SELECT 
USING (user_id = auth.uid());

-- Step 4: Improve the useContractorIdentification hook functionality
-- Add logging function for debugging
CREATE OR REPLACE FUNCTION public.log_contractor_access(user_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    contractor_count int;
    result_text text;
BEGIN
    SELECT count(*) INTO contractor_count
    FROM public.contractors 
    WHERE user_id = user_id_param;
    
    result_text := 'User ID: ' || user_id_param || ', Contractor records found: ' || contractor_count;
    
    RAISE LOG '%', result_text;
    RETURN result_text;
END;
$function$;