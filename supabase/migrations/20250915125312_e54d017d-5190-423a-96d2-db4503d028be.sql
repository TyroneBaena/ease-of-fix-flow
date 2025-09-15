-- First, let's find the Test Data 67767 request and assign it to the qolorily@forexnews.bg contractor
UPDATE maintenance_requests 
SET contractor_id = 'd2c10af6-f0c0-4249-8665-87a71c23835f',
    assigned_at = now(),
    status = 'in_progress'
WHERE title = 'Test Data 67767';

-- Also update any existing quotes for this request to point to the correct contractor
UPDATE quotes 
SET contractor_id = 'd2c10af6-f0c0-4249-8665-87a71c23835f'
WHERE request_id IN (
  SELECT id FROM maintenance_requests WHERE title = 'Test Data 67767'
);

-- Log the assignment
INSERT INTO activity_logs (
  request_id,
  action_type,
  description,
  actor_name,
  actor_role,
  organization_id
)
SELECT 
  mr.id,
  'contractor_assigned',
  'Contractor Abu Dhabi Services assigned to request',
  'System Admin',
  'admin',
  mr.organization_id
FROM maintenance_requests mr
WHERE mr.title = 'Test Data 67767';