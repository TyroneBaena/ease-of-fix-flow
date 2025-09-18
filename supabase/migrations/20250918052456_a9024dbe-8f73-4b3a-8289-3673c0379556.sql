-- Fix the database functions that cause read-only transaction errors
-- Replace get_current_user_organization with a read-only version for policies

CREATE OR REPLACE FUNCTION public.get_current_user_organization_safe()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  org_id uuid;
  user_uuid uuid;
BEGIN
  user_uuid := auth.uid();
  
  IF user_uuid IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Try to get session organization first (read-only)
  SELECT session_organization_id INTO org_id
  FROM public.profiles
  WHERE id = user_uuid;
  
  -- If no session organization, get default organization
  IF org_id IS NULL THEN
    SELECT organization_id INTO org_id
    FROM public.profiles
    WHERE id = user_uuid;
  END IF;
  
  -- If still null, try first active organization
  IF org_id IS NULL THEN
    SELECT organization_id INTO org_id
    FROM public.user_organizations
    WHERE user_id = user_uuid 
    AND is_active = true
    ORDER BY is_default DESC, created_at ASC
    LIMIT 1;
  END IF;
  
  RETURN org_id;
END;
$function$;

-- Fix get_current_user_role to be truly stable without updates
CREATE OR REPLACE FUNCTION public.get_current_user_role_safe()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_role text;
  user_uuid uuid;
  current_org_id uuid;
BEGIN
  user_uuid := auth.uid();
  
  IF user_uuid IS NULL THEN
    RETURN 'manager';
  END IF;
  
  -- Get current organization safely
  current_org_id := public.get_current_user_organization_safe();
  
  -- Get role from user_organizations table first
  IF current_org_id IS NOT NULL THEN
    SELECT role INTO user_role
    FROM public.user_organizations
    WHERE user_id = user_uuid 
    AND organization_id = current_org_id
    AND is_active = true;
  END IF;
  
  -- Fallback to profiles table role
  IF user_role IS NULL THEN
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = user_uuid;
  END IF;
  
  RETURN COALESCE(user_role, 'manager');
END;
$function$;

-- Create a function to safely set user organization
CREATE OR REPLACE FUNCTION public.ensure_user_has_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_org_id uuid;
  org_name text;
  org_slug text;
BEGIN
  -- Only create organization if user doesn't have one
  IF NEW.organization_id IS NULL THEN
    -- Create organization
    org_name := split_part(NEW.email, '@', 1) || '''s Organization';
    org_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9]', '', 'g')) || 
                substr(md5(random()::text), 1, 6);
    
    INSERT INTO public.organizations (name, slug, created_by)
    VALUES (org_name, org_slug, NEW.id)
    RETURNING id INTO new_org_id;
    
    -- Update the user's profile with the organization_id
    NEW.organization_id := new_org_id;
    NEW.session_organization_id := new_org_id;
    
    -- Create the user organization membership
    INSERT INTO public.user_organizations (
      user_id, 
      organization_id, 
      role, 
      is_active, 
      is_default
    ) VALUES (
      NEW.id, 
      new_org_id, 
      COALESCE(NEW.role, 'admin'), -- First user should be admin
      true, 
      true
    );
    
    RAISE LOG 'Created organization % for user %', new_org_id, NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE LOG 'Error ensuring organization for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- Replace the trigger for organization creation
DROP TRIGGER IF EXISTS on_profile_created_create_organization ON public.profiles;
CREATE TRIGGER on_profile_created_create_organization
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_user_has_organization();