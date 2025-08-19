-- Remove the trigger that's causing race conditions during signup
-- The application already has robust manual schema creation logic in place
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;