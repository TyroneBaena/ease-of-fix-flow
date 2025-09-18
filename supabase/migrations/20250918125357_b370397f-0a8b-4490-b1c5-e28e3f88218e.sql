-- Fix contractor user_id linkage for Node JS contractor
UPDATE contractors 
SET user_id = (
  SELECT id FROM profiles 
  WHERE email = contractors.email
) 
WHERE email = 'sheep26308@mailshan.com' 
AND user_id != (
  SELECT id FROM profiles 
  WHERE email = contractors.email
);