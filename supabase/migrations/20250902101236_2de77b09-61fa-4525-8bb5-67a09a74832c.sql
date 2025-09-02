-- Create missing profile for the "Added Company" contractor user
INSERT INTO public.profiles (
  id, 
  email, 
  name, 
  role, 
  organization_id,
  assigned_properties
) VALUES (
  '9536b389-600b-406b-ab38-9b62a9fcb481',
  'contractor@addedcompany.com',
  'Added Person',
  'contractor',
  '671e7cee-97b7-4749-91a7-71d7b5e85134',
  ARRAY[]::text[]
) ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  role = EXCLUDED.role;