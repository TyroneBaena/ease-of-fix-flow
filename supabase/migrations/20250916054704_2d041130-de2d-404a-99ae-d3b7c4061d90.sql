-- Fix Request 1 to be assigned to Javascript contractor and in correct organization
UPDATE maintenance_requests 
SET 
  contractor_id = 'ea6f9b1d-0f1c-4950-8468-a9b41e36e108',
  organization_id = 'c04a0c1d-c151-4263-86e4-170e6bff8420',
  status = 'in_progress',
  assigned_at = NOW()
WHERE id = '91d4a540-3cd2-4a9b-9404-362621d882f7' 
AND title = 'Request 1';

-- Also create a quote record for this request to show it in pending quotes
INSERT INTO quotes (
  request_id,
  contractor_id,
  amount,
  description,
  status,
  organization_id
) VALUES (
  '91d4a540-3cd2-4a9b-9404-362621d882f7',
  'ea6f9b1d-0f1c-4950-8468-a9b41e36e108',
  1500.00,
  'Quote for Request 1 maintenance work',
  'requested',
  'c04a0c1d-c151-4263-86e4-170e6bff8420'
) ON CONFLICT DO NOTHING;