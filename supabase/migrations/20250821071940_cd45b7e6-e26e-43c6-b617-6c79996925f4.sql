-- Step 1: Fix the duplicate contractors issue first
-- Keep the most recent contractor for each user_id and remove older ones
DELETE FROM public.contractors 
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id) id
    FROM public.contractors
    ORDER BY user_id, updated_at DESC, created_at DESC
);

-- Step 2: Create the missing contractor profile for contractor@test.com user
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

-- Step 3: Assign a maintenance request to this contractor for testing
UPDATE public.maintenance_requests 
SET contractor_id = (
    SELECT id FROM public.contractors 
    WHERE user_id = '8325054d-a806-4642-90c7-f15195cb566b'
    LIMIT 1
),
status = 'in-progress',
assigned_at = now()
WHERE id = (
    SELECT id FROM public.maintenance_requests 
    WHERE contractor_id IS NULL 
    AND quote_requested = true 
    LIMIT 1
);

-- Step 4: Add unique constraint
ALTER TABLE public.contractors 
ADD CONSTRAINT contractors_user_id_unique UNIQUE (user_id);

-- Step 5: Create index for performance
CREATE INDEX IF NOT EXISTS idx_contractors_user_id ON public.contractors(user_id);