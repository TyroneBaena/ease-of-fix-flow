-- Update existing contractors without organization_id to use the current organization
UPDATE contractors 
SET organization_id = 'c0c9117b-ec60-4ff4-9f07-d68ff90512c5'
WHERE organization_id IS NULL;