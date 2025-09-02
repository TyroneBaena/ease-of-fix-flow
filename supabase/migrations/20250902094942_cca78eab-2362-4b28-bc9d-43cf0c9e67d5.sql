-- Find the most recent admin user's organization and update contractors to match
UPDATE contractors 
SET organization_id = (
  SELECT organization_id 
  FROM profiles 
  WHERE role = 'admin' 
  ORDER BY created_at DESC 
  LIMIT 1
)
WHERE created_at >= NOW() - INTERVAL '1 day';