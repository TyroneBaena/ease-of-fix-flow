-- Fix contractor organization mismatch and create test request
UPDATE contractors 
SET organization_id = 'c04a0c1d-c151-4263-86e4-170e6bff8420'
WHERE id = 'ea6f9b1d-0f1c-4950-8468-a9b41e36e108' 
AND email = 'qirasary@fxzig.com';

-- Create a test property for this organization if it doesn't exist
INSERT INTO properties (
  name, address, contact_number, email, practice_leader, 
  user_id, organization_id
) VALUES (
  'Test Property - Javascript Contractor',
  '456 Contractor Street, Test City',
  '+1234567890',
  'qirasary@fxzig.com',
  'Test Practice Leader',
  '70bd79e9-4984-4fb5-a104-8eb6599f8568',
  'c04a0c1d-c151-4263-86e4-170e6bff8420'
) ON CONFLICT DO NOTHING;

-- Create test maintenance requests assigned to the Javascript contractor
INSERT INTO maintenance_requests (
  title, description, category, location, priority, status, 
  user_id, organization_id, contractor_id, assigned_at, property_id
) 
SELECT 
  'Kitchen Sink Repair - Javascript Contractor',
  'Kitchen sink is leaking and needs immediate attention from Javascript contractor',
  'plumbing',
  'Kitchen',
  'high',
  'in_progress',
  '70bd79e9-4984-4fb5-a104-8eb6599f8568',
  'c04a0c1d-c151-4263-86e4-170e6bff8420',
  'ea6f9b1d-0f1c-4950-8468-a9b41e36e108',
  NOW(),
  p.id
FROM properties p 
WHERE p.organization_id = 'c04a0c1d-c151-4263-86e4-170e6bff8420' 
LIMIT 1;