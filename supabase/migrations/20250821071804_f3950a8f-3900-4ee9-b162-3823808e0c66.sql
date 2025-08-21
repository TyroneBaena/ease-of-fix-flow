-- First, let's clean up the duplicate contractors and fix the data integrity issue

-- Step 1: Remove duplicate contractors for the same user_id
DELETE FROM public.contractors 
WHERE id IN (
    SELECT id FROM (
        SELECT id, 
               ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
        FROM public.contractors
    ) t 
    WHERE t.rn > 1
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
) ON CONFLICT (user_id) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    contact_name = EXCLUDED.contact_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    specialties = EXCLUDED.specialties,
    updated_at = now();

-- Step 3: Add unique constraint to prevent future issues
ALTER TABLE public.contractors 
ADD CONSTRAINT contractors_user_id_unique UNIQUE (user_id);

-- Step 4: Create index for performance
CREATE INDEX IF NOT EXISTS idx_contractors_user_id ON public.contractors(user_id);