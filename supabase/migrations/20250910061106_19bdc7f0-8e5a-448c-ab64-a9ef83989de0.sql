-- Fix missing profile and contractor records for user: 0bbb7820-52ed-4f78-933f-2dc1575db5fd

-- First, check if profile exists
INSERT INTO public.profiles (id, email, name, role, organization_id, created_at, updated_at)
VALUES (
  '0bbb7820-52ed-4f78-933f-2dc1575db5fd'::uuid,
  'fugafeza@cyclelove.cc',
  'Contractor User',
  'contractor',
  'aebcc3ab-5aa6-4c82-a075-a7d130866a12'::uuid, -- Using the org from existing contractor record
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'contractor',
  updated_at = now();

-- Create contractor record if it doesn't exist
INSERT INTO public.contractors (
  id, 
  user_id, 
  company_name, 
  contact_name, 
  email, 
  phone, 
  address, 
  specialties, 
  organization_id,
  created_at, 
  updated_at
)
VALUES (
  gen_random_uuid(),
  '0bbb7820-52ed-4f78-933f-2dc1575db5fd'::uuid,
  'Default Company',
  'Contractor User',
  'fugafeza@cyclelove.cc',
  '+1 (555) 000-0000',
  'Address to be updated',
  ARRAY['General Maintenance']::text[],
  'aebcc3ab-5aa6-4c82-a075-a7d130866a12'::uuid,
  now(),
  now()
)
ON CONFLICT (user_id) DO NOTHING;

-- Verify the records were created
SELECT 'Profile created/updated' as action, id, email, role, organization_id 
FROM profiles 
WHERE id = '0bbb7820-52ed-4f78-933f-2dc1575db5fd'::uuid

UNION ALL

SELECT 'Contractor created' as action, c.id, c.email, 'contractor' as role, c.organization_id
FROM contractors c
WHERE c.user_id = '0bbb7820-52ed-4f78-933f-2dc1575db5fd'::uuid;