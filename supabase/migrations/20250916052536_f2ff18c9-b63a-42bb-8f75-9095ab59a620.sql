-- Create a test property and maintenance request for the contractor organization
INSERT INTO properties (
  name,
  address,
  contact_number,
  email,
  practice_leader,
  user_id,
  organization_id
) VALUES (
  'Test Property',
  '123 Test Street, Test City',
  '+1234567890',
  'test@example.com',
  'Test Practice Leader',
  '077acf1f-d499-4240-8a08-1a1e9bd60531',
  '464a9bac-bcee-41c5-8e4d-e0278fce9e01'
) ON CONFLICT DO NOTHING;

-- Create a test maintenance request assigned to the contractor
INSERT INTO maintenance_requests (
  title,
  description,
  category,
  location,
  priority,
  status,
  user_id,
  property_id,
  organization_id,
  contractor_id,
  assigned_at
) 
SELECT 
  'Test Plumbing Issue',
  'Leaky faucet in the kitchen needs repair',
  'plumbing',
  'Kitchen',
  'medium',
  'in_progress',
  '077acf1f-d499-4240-8a08-1a1e9bd60531',
  p.id,
  '464a9bac-bcee-41c5-8e4d-e0278fce9e01',
  '4f9e79be-4281-48c5-871e-4ab39de8298c',
  NOW()
FROM properties p 
WHERE p.organization_id = '464a9bac-bcee-41c5-8e4d-e0278fce9e01' 
LIMIT 1;