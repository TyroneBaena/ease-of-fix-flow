-- Fix the confirmation_token NULL issue for the test user
UPDATE auth.users 
SET 
  confirmation_token = '',
  recovery_token = '',
  email_change_token_new = '',
  email_change = ''
WHERE email = 'test@example.com' 
AND (confirmation_token IS NULL OR recovery_token IS NULL OR email_change_token_new IS NULL OR email_change IS NULL);