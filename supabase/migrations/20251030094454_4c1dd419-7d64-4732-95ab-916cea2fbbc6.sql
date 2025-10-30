-- Delete the orphaned profile that references a non-existent auth user
-- This will allow the trigger to create a fresh profile for the current auth user
DELETE FROM profiles 
WHERE email = 'ayushi.sharma0991@gmail.com' 
  AND id = '00cacec6-0c46-4e8b-baff-a57949970dc6'::uuid;