-- Fix profile organization_id to match contractor's organization
UPDATE profiles 
SET organization_id = (
  SELECT c.organization_id 
  FROM contractors c 
  WHERE c.user_id = profiles.id
)
WHERE id = '84db4e4b-66e3-428f-aeba-f6e4df8d7857' 
AND organization_id IS NULL;