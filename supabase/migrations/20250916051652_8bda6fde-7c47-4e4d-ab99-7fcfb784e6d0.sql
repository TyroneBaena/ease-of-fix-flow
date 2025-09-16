-- Create contractor record for the user gilocoba@forexnews.bg
INSERT INTO contractors (
  user_id,
  email,
  contact_name,
  company_name,
  phone,
  address,
  specialties,
  organization_id
) VALUES (
  '077acf1f-d499-4240-8a08-1a1e9bd60531',
  'gilocoba@forexnews.bg',
  'Contractor',
  'Contractor Services',
  '',
  '',
  ARRAY[]::text[],
  '464a9bac-bcee-41c5-8e4d-e0278fce9e01'
) ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  organization_id = EXCLUDED.organization_id;