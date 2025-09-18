-- Fix the organization onboarding bypass issue
-- The problem: ProtectedRoute only checks for user authentication, not organization membership

-- Step 1: First, let's see what triggers exist and ensure the right one is active
SELECT tgname, tgrelid::regclass, pg_get_triggerdef(oid) FROM pg_trigger WHERE tgname LIKE '%auth_user%';

-- Step 2: Drop the old handle_new_user function that still creates organizations
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 3: Ensure the correct trigger is in place
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile_only();

-- Step 4: Clean up any users who got organizations from the old function
-- For the current test user, we need to clean up their auto-created organization
-- and set them back to manager role so they go through onboarding

-- Get the current test user's auto-created organization
UPDATE public.profiles 
SET role = 'manager',
    organization_id = NULL,
    session_organization_id = NULL
WHERE email = 'tuatara37332@aminating.com';

-- Remove them from user_organizations if they were auto-added
DELETE FROM public.user_organizations 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'tuatara37332@aminating.com');

-- Clean up any auto-created organization for this test user
DELETE FROM public.organizations 
WHERE created_by = (SELECT id FROM auth.users WHERE email = 'tuatara37332@aminating.com');