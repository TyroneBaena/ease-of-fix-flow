-- Create a test maintenance request and assign it to the contractor
-- First, get a property from the same organization to assign the request to
WITH org_property AS (
  SELECT id FROM properties 
  WHERE organization_id = '464a9bac-bcee-41c5-8e4d-e0278fce9e01' 
  LIMIT 1
),
test_request AS (
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
    op.id,
    '464a9bac-bcee-41c5-8e4d-e0278fce9e01',
    '4f9e79be-4281-48c5-871e-4ab39de8298c',
    NOW()
  FROM org_property op
  RETURNING id
)
SELECT 'Created test maintenance request with ID: ' || id::text as result FROM test_request;