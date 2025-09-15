-- Move the qolorily@forexnews.bg contractor to the correct organization and update user_id
UPDATE contractors 
SET organization_id = '4eea43f3-a724-4381-86c2-09afce3adbe4',
    user_id = '6d6dba13-ea96-4190-aec0-4d289895f988'
WHERE email = 'qolorily@forexnews.bg';

-- Also update the maintenance request assignment to ensure it's in the same organization
UPDATE maintenance_requests 
SET organization_id = '4eea43f3-a724-4381-86c2-09afce3adbe4'
WHERE contractor_id = 'd2c10af6-f0c0-4249-8665-87a71c23835f';

-- Update any quotes as well
UPDATE quotes 
SET organization_id = '4eea43f3-a724-4381-86c2-09afce3adbe4'
WHERE contractor_id = 'd2c10af6-f0c0-4249-8665-87a71c23835f';