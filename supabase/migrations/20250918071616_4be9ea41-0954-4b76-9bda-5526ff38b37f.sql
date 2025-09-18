-- Fix security issues by adding search_path to functions

-- Fix handle_new_user_profile_only function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix create_organization_for_new_user function
CREATE OR REPLACE FUNCTION public.create_organization_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- This function is now disabled to prevent automatic organization creation
  -- Users should go through proper onboarding flow
  RAISE LOG 'Automatic organization creation disabled - user should use onboarding flow';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix ensure_user_has_organization function
CREATE OR REPLACE FUNCTION public.ensure_user_has_organization()
RETURNS TRIGGER AS $$
BEGIN
  -- This function is now disabled to prevent automatic organization creation
  -- Users should go through proper onboarding flow
  RAISE LOG 'Automatic organization creation disabled - user should use onboarding flow';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;