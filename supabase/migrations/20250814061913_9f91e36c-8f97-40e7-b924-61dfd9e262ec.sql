-- First, remove the incorrectly created user
DELETE FROM auth.users WHERE email = 'test@example.com';

-- Remove from profiles if it exists
DELETE FROM profiles WHERE email = 'test@example.com';

-- Now create the user properly with all required fields
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  raw_user_meta_data,
  user_metadata,
  is_super_admin,
  role,
  aud
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test@example.com',
  crypt('testpassword123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  '',
  '{"name": "Test User", "role": "admin"}'::jsonb,
  '{"name": "Test User", "role": "admin"}'::jsonb,
  false,
  'authenticated',
  'authenticated'
);