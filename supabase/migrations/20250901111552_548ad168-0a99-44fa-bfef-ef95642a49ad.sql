-- Fix the organization creation trigger timing issue
-- The trigger needs to run AFTER INSERT, not BEFORE INSERT
-- This ensures the user exists in auth.users before creating the organization

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_auth_user_create_organization ON auth.users;

-- Recreate the function to be safer with error handling
CREATE OR REPLACE FUNCTION public.create_organization_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id UUID;
  org_name TEXT;
  org_slug TEXT;
  counter INTEGER := 0;
  base_slug TEXT;
BEGIN
  -- Generate organization name from user's name or email
  org_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)) || '''s Organization';
  
  -- Generate unique slug
  base_slug := lower(regexp_replace(
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), 
    '[^a-zA-Z0-9]', '', 'g'
  ));
  
  -- Ensure slug is unique
  org_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = org_slug) LOOP
    counter := counter + 1;
    org_slug := base_slug || counter::text;
  END LOOP;
  
  -- Create organization (now user definitely exists in auth.users)
  INSERT INTO public.organizations (name, slug, created_by)
  VALUES (org_name, org_slug, NEW.id)
  RETURNING id INTO new_org_id;
  
  -- Update user metadata with organization_id
  UPDATE auth.users 
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('organization_id', new_org_id::text)
  WHERE id = NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE LOG 'Error creating organization for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- Create the trigger to run AFTER INSERT
CREATE TRIGGER on_auth_user_create_organization
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_organization_for_new_user();