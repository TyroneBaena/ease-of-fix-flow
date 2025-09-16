-- Create sample maintenance requests for john constructions organization
INSERT INTO public.maintenance_requests (
  id,
  title,
  description,
  category,
  location,
  priority,
  status,
  user_id,
  property_id,
  organization_id,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  'Broken Air Conditioning Unit',
  'The air conditioning unit in the main conference room is not functioning. Room temperature is uncomfortably warm which is affecting meetings.',
  'HVAC',
  'Conference Room A, 2nd Floor',
  'high',
  'pending',
  '9c8a677a-51fd-466e-b29d-3f49a8801e34',
  'e13f5ef2-5257-4592-86da-b387d12a3824',
  '395ee3e5-19ae-4475-aa1b-c3562774a3dd',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
),
(
  gen_random_uuid(),
  'Leaking Faucet in Restroom',
  'The sink faucet in the women''s restroom on the 1st floor is constantly dripping. This is causing water wastage and an annoying sound.',
  'Plumbing',
  'Women''s Restroom, 1st Floor',
  'medium',
  'in-progress',
  '9c8a677a-51fd-466e-b29d-3f49a8801e34',
  'e13f5ef2-5257-4592-86da-b387d12a3824',
  '395ee3e5-19ae-4475-aa1b-c3562774a3dd',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '1 day'
),
(
  gen_random_uuid(),
  'Light Bulb Replacement',
  'Multiple light bulbs have burnt out in the open office area near the marketing department. The area is now too dim for comfortable working.',
  'Electrical',
  'Open Office, 3rd Floor',
  'low',
  'completed',
  '9c8a677a-51fd-466e-b29d-3f49a8801e34',
  'e13f5ef2-5257-4592-86da-b387d12a3824',
  '395ee3e5-19ae-4475-aa1b-c3562774a3dd',
  NOW() - INTERVAL '1 week',
  NOW() - INTERVAL '3 days'
);

-- Create sample contractors for john constructions organization
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
) VALUES 
(
  gen_random_uuid(),
  '4fb9020a-5d9a-48cf-ae60-b9414baaea8f',
  'ABC Plumbing Services',
  'John Smith',
  'john@abcplumbing.com',
  '+1-555-0123',
  '123 Main St, City, State 12345',
  ARRAY['Plumbing', 'Pipe Repair', 'Drain Cleaning'],
  '395ee3e5-19ae-4475-aa1b-c3562774a3dd',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '7d40b881-86bf-4525-a148-209e2d058e71',
  'TechFix HVAC',
  'Mike Johnson',
  'mike@techfixhvac.com',
  '+1-555-0456',
  '456 Oak Ave, City, State 12345',
  ARRAY['HVAC', 'Air Conditioning', 'Heating Systems'],
  '395ee3e5-19ae-4475-aa1b-c3562774a3dd',
  NOW(),
  NOW()
);