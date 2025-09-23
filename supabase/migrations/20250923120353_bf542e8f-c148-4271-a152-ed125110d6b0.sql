-- Fix existing maintenance requests that have UUIDs or empty values in the site field
UPDATE maintenance_requests 
SET site = (
  SELECT name 
  FROM properties 
  WHERE id = maintenance_requests.property_id
) 
WHERE site IS NULL 
   OR site = '' 
   OR site ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';