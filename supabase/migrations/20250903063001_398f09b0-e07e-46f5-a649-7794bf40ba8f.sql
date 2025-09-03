-- Phase 2: Multi-Organization User Support

-- Step 1: Create user_organizations junction table for many-to-many relationships
CREATE TABLE public.user_organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'manager',
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Step 2: Enable RLS on user_organizations
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies for user_organizations
CREATE POLICY "Users can view their own organization memberships"
ON public.user_organizations
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own organization memberships"
ON public.user_organizations
FOR UPDATE
USING (user_id = auth.uid());

-- Step 4: Add session_organization_id to profiles for current session context
ALTER TABLE public.profiles 
ADD COLUMN session_organization_id uuid;

-- Step 5: Create function to get user's default organization
CREATE OR REPLACE FUNCTION public.get_user_default_organization(user_uuid uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  default_org_id uuid;
BEGIN
  -- First try to get the organization marked as default
  SELECT organization_id INTO default_org_id
  FROM public.user_organizations
  WHERE user_id = user_uuid 
  AND is_active = true 
  AND is_default = true
  LIMIT 1;
  
  -- If no default, get the first active organization
  IF default_org_id IS NULL THEN
    SELECT organization_id INTO default_org_id
    FROM public.user_organizations
    WHERE user_id = user_uuid 
    AND is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;
  
  -- Fallback to the organization_id in profiles table
  IF default_org_id IS NULL THEN
    SELECT organization_id INTO default_org_id
    FROM public.profiles
    WHERE id = user_uuid;
  END IF;
  
  RETURN default_org_id;
END;
$$;

-- Step 6: Create function to switch user's session organization
CREATE OR REPLACE FUNCTION public.switch_user_organization(new_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_uuid uuid;
  has_access boolean := false;
BEGIN
  user_uuid := auth.uid();
  
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Check if user has access to the organization
  SELECT EXISTS(
    SELECT 1 FROM public.user_organizations 
    WHERE user_id = user_uuid 
    AND organization_id = new_org_id 
    AND is_active = true
  ) INTO has_access;
  
  IF NOT has_access THEN
    RAISE EXCEPTION 'User does not have access to this organization';
  END IF;
  
  -- Update the session organization in profiles
  UPDATE public.profiles 
  SET session_organization_id = new_org_id,
      updated_at = now()
  WHERE id = user_uuid;
  
  RETURN true;
END;
$$;

-- Step 7: Update get_current_user_organization to use session context
CREATE OR REPLACE FUNCTION public.get_current_user_organization()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- Step 8: Create function to get user's role in current organization
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role text;
  user_uuid uuid;
  current_org_id uuid;
BEGIN
  user_uuid := auth.uid();
  current_org_id := public.get_current_user_organization();
  
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
$$;

-- Step 9: Create trigger to automatically create user_organizations entry when profile is created
CREATE OR REPLACE FUNCTION public.create_user_organization_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create membership in user_organizations table
  IF NEW.organization_id IS NOT NULL THEN
    INSERT INTO public.user_organizations (
      user_id, 
      organization_id, 
      role, 
      is_active, 
      is_default
    ) VALUES (
      NEW.id, 
      NEW.organization_id, 
      COALESCE(NEW.role, 'manager'), 
      true, 
      true
    )
    ON CONFLICT (user_id, organization_id) DO UPDATE SET
      role = COALESCE(NEW.role, 'manager'),
      is_active = true,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 10: Create trigger
CREATE TRIGGER create_user_organization_membership_trigger
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_organization_membership();

-- Step 11: Migrate existing data to new structure
INSERT INTO public.user_organizations (user_id, organization_id, role, is_active, is_default)
SELECT 
  id as user_id,
  organization_id,
  role,
  true as is_active,
  true as is_default
FROM public.profiles 
WHERE organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;