-- Create the missing get_current_user_role_safe() function
-- This function is referenced by RLS policies but was missing from the database

CREATE OR REPLACE FUNCTION public.get_current_user_role_safe()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
  user_uuid uuid;
  current_org_id uuid;
BEGIN
  user_uuid := auth.uid();
  
  IF user_uuid IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get current organization
  current_org_id := public.get_current_user_organization_safe();
  
  IF current_org_id IS NULL THEN
    -- Fallback to profile role
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = user_uuid;
    RETURN user_role;
  END IF;
  
  -- Get role from user_organizations table for current organization
  SELECT role INTO user_role
  FROM public.user_organizations
  WHERE user_id = user_uuid 
    AND organization_id = current_org_id
    AND is_active = true;
  
  -- Fallback to profiles table role if not in user_organizations
  IF user_role IS NULL THEN
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = user_uuid;
  END IF;
  
  RETURN COALESCE(user_role, 'manager');
EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL on any error to fail safe
    RETURN NULL;
END;
$$;