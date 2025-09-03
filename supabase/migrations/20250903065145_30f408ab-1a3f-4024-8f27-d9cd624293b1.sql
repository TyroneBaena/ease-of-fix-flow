-- Fix database functions that are incorrectly marked as STABLE when they perform UPDATE operations

-- Fix get_current_user_organization function - it performs UPDATE operations so needs to be VOLATILE
CREATE OR REPLACE FUNCTION public.get_current_user_organization()
 RETURNS uuid
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  org_id uuid;
  user_uuid uuid;
BEGIN
  user_uuid := auth.uid();
  
  IF user_uuid IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- First try to get session organization
  SELECT session_organization_id INTO org_id
  FROM public.profiles
  WHERE id = user_uuid;
  
  -- If no session organization, get default organization
  IF org_id IS NULL THEN
    org_id := public.get_user_default_organization(user_uuid);
    
    -- Set it as session organization for future use
    IF org_id IS NOT NULL THEN
      UPDATE public.profiles 
      SET session_organization_id = org_id 
      WHERE id = user_uuid;
    END IF;
  END IF;
  
  RETURN org_id;
END;
$function$;

-- Fix get_current_user_role function - make it STABLE since it only reads
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role text;
  user_uuid uuid;
  current_org_id uuid;
BEGIN
  user_uuid := auth.uid();
  
  -- Get current organization without updating anything
  SELECT session_organization_id INTO current_org_id
  FROM public.profiles
  WHERE id = user_uuid;
  
  -- If no session organization, get default without updating
  IF current_org_id IS NULL THEN
    current_org_id := public.get_user_default_organization(user_uuid);
  END IF;
  
  -- Get role from user_organizations table for current organization
  SELECT role INTO user_role
  FROM public.user_organizations
  WHERE user_id = user_uuid 
  AND organization_id = current_org_id
  AND is_active = true;
  
  -- Fallback to profiles table role
  IF user_role IS NULL THEN
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = user_uuid;
  END IF;
  
  RETURN COALESCE(user_role, 'manager');
END;
$function$;