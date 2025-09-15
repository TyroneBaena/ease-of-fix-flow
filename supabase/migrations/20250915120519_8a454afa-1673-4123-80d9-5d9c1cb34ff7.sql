-- Create a quote record for the assigned contractor to show in pending quotes
INSERT INTO quotes (
  request_id,
  contractor_id,
  amount,
  description,
  status,
  organization_id,
  created_at,
  updated_at,
  submitted_at
) VALUES (
  '2100c84a-87eb-4acd-a17d-bfa0718694d9', -- Test Data 67767 request
  'ee7f77de-3868-47e6-81cf-dee876c676e9', -- John Doe contractor
  0, -- Default amount, contractor will update
  'Quote requested for: Test Data 67767',
  'requested', -- This will show in pending quote requests
  '395ee3e5-19ae-4475-aa1b-c3562774a3dd', -- Organization ID
  now(),
  now(),
  now()
);

-- Update the maintenance request to have quote_requested = true
UPDATE maintenance_requests 
SET quote_requested = true,
    status = 'requested'
WHERE id = '2100c84a-87eb-4acd-a17d-bfa0718694d9';