-- Disable automatic organization creation triggers that bypass onboarding flow
-- These triggers are creating multiple organizations per user automatically

-- Drop the problematic triggers that create organizations automatically
DROP TRIGGER IF EXISTS on_auth_user_create_organization ON auth.users;
DROP TRIGGER IF EXISTS on_profile_created_create_organization ON profiles;

-- Keep the handle_new_user trigger but modify it to only create profiles, not organizations
-- First, let's see what handle_new_user does and modify it

-- Create a new version of handle_new_user that only creates profile, not organization
CREATE OR REPLACE FUNCTION public.handle_new_user_profile_only()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create the profile record, no automatic organization creation
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    'manager'  -- Default role, will be set to admin when they create organization
  );
  
  -- Log the profile creation
  RAISE LOG 'Created profile for user: %, role: %', NEW.email, 'manager';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace the existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile_only();

-- Clean up the automatic organization creation functions since they shouldn't be used
-- We'll keep them but add safety checks

-- Add safety check to prevent automatic organization creation
CREATE OR REPLACE FUNCTION public.create_organization_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- This function is now disabled to prevent automatic organization creation
  -- Users should go through proper onboarding flow
  RAISE LOG 'Automatic organization creation disabled - user should use onboarding flow';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.ensure_user_has_organization()
RETURNS TRIGGER AS $$
BEGIN
  -- This function is now disabled to prevent automatic organization creation
  -- Users should go through proper onboarding flow
  RAISE LOG 'Automatic organization creation disabled - user should use onboarding flow';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;