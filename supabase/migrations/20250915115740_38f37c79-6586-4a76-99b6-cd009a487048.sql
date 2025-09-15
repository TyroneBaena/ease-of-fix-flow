-- Create contractor profile for John Doe
INSERT INTO contractors (
  user_id,
  company_name,
  contact_name,
  email,
  phone,
  organization_id,
  created_at,
  updated_at
) VALUES (
  '4fb9020a-5d9a-48cf-ae60-b9414baaea8f',
  'John Doe Contracting',
  'John Doe',
  'jijezu@forexzig.com',
  '+1234567890',
  '395ee3e5-19ae-4475-aa1b-c3562774a3dd',
  now(),
  now()
);

-- Assign the test request to John Doe contractor
UPDATE maintenance_requests 
SET contractor_id = (
  SELECT id FROM contractors WHERE email = 'jijezu@forexzig.com'
)
WHERE description LIKE '%Test Data 67767%';