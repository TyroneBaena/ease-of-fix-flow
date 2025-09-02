-- PHASE 1 COMPLETE BUG FIXES

-- Step 1: Create proper organization trigger for new users
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW 
  EXECUTE FUNCTION public.create_organization_for_new_user();

-- Step 2: Fix the organization creation function to properly set organization_id
CREATE OR REPLACE FUNCTION public.create_organization_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  org_name TEXT;
  org_slug TEXT;
BEGIN
  -- Only create organization if user doesn't have one
  IF NEW.organization_id IS NULL THEN
    -- Simple organization name from email
    org_name := split_part(NEW.email, '@', 1) || '''s Organization';
    
    -- Simple slug without loops - just add random suffix
    org_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9]', '', 'g')) || substr(md5(random()::text), 1, 6);
    
    -- Create organization
    INSERT INTO public.organizations (name, slug, created_by)
    VALUES (org_name, org_slug, NEW.id)
    RETURNING id INTO new_org_id;
    
    -- Update the user's profile with the organization_id
    UPDATE public.profiles 
    SET organization_id = new_org_id 
    WHERE id = NEW.id;
    
    RAISE LOG 'Created organization % for user %', new_org_id, NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't block user creation
    RAISE LOG 'Error creating organization for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;