-- Create missing profile for authenticated user
INSERT INTO public.profiles (id, email, name, role, organization_id)
VALUES (
  '2312be27-5b1b-44b9-a046-1384fad32f41',
  'sijihiqa@cyclelove.cc',
  'demo 2',
  'manager',
  '5bef2ccc-d782-482b-8285-ca96d5b0ec85'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  organization_id = EXCLUDED.organization_id;