-- ============================================
-- CRITICAL SECURITY FIX: Migrate roles to separate table
-- ============================================

-- 1. Create the app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'contractor');

-- 2. Create the user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::app_role
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Create RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles in their organization"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND user_id IN (
    SELECT id FROM profiles 
    WHERE organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND user_id IN (
    SELECT id FROM profiles 
    WHERE organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- ============================================
-- FIX #1: Secure profiles table - stricter RLS
-- ============================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Deny public access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile or admins can view org profile" ON public.profiles;

-- Create strict new policies using has_role function
CREATE POLICY "Users can view only their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can view profiles in their organization"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND organization_id = (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- ============================================
-- FIX #2: Secure contractors table - role-based access
-- ============================================

-- Drop existing broad policies
DROP POLICY IF EXISTS "Deny public access to contractors" ON public.contractors;
DROP POLICY IF EXISTS "Users can view contractors in their organization" ON public.contractors;
DROP POLICY IF EXISTS "Admins and managers can manage contractors" ON public.contractors;

-- Create strict role-based policies
CREATE POLICY "Only admins and managers can view contractors"
ON public.contractors
FOR SELECT
TO authenticated
USING (
  (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  AND organization_id = (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Only admins can manage contractors"
ON public.contractors
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND organization_id = (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND organization_id = (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- ============================================
-- FIX #3: Remove Google Maps API key from database
-- ============================================

-- Drop the google_maps_api_key column from app_settings
-- (API key should be in environment variables only)
ALTER TABLE public.app_settings 
DROP COLUMN IF EXISTS google_maps_api_key;

-- Add comment explaining the security decision
COMMENT ON TABLE public.app_settings IS 'Application settings. API keys must be stored in environment variables, not in the database.';

-- ============================================
-- Additional Security: Update get_current_user_role functions
-- ============================================

-- Update the get_current_user_role_safe function to use user_roles table
CREATE OR REPLACE FUNCTION public.get_current_user_role_safe()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'contractor' THEN 3
    END
  LIMIT 1
$$;

-- Create audit trigger for user_roles changes
CREATE OR REPLACE FUNCTION public.audit_user_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (
      organization_id,
      action_type,
      description,
      actor_name,
      metadata
    )
    SELECT 
      p.organization_id,
      'role_assigned',
      'Role ' || NEW.role || ' assigned to user',
      (SELECT name FROM profiles WHERE id = auth.uid()),
      jsonb_build_object(
        'user_id', NEW.user_id,
        'role', NEW.role,
        'assigned_by', auth.uid()
      )
    FROM profiles p
    WHERE p.id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_logs (
      organization_id,
      action_type,
      description,
      actor_name,
      metadata
    )
    SELECT 
      p.organization_id,
      'role_revoked',
      'Role ' || OLD.role || ' revoked from user',
      (SELECT name FROM profiles WHERE id = auth.uid()),
      jsonb_build_object(
        'user_id', OLD.user_id,
        'role', OLD.role,
        'revoked_by', auth.uid()
      )
    FROM profiles p
    WHERE p.id = OLD.user_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_user_role_changes_trigger
AFTER INSERT OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.audit_user_role_changes();