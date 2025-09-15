-- Fix organization creation issues

-- Drop the problematic debug function that's causing the organization creation to fail
DROP FUNCTION IF EXISTS public.debug_user_auth_status();

-- Simplify the organization creation trigger to be more reliable
DROP TRIGGER IF EXISTS log_organization_creation_trigger ON public.organizations;
DROP FUNCTION IF EXISTS public.log_organization_creation();

-- Create a simpler logging function that won't block organization creation
CREATE OR REPLACE FUNCTION public.log_organization_creation_simple()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Just log and continue, don't block on errors
  RAISE LOG 'Organization created: id=%, name=%, created_by=%', NEW.id, NEW.name, NEW.created_by;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block the insert
    RAISE LOG 'Organization creation logging error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER log_organization_creation_simple_trigger
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.log_organization_creation_simple();

-- Ensure the organizations table RLS policy is correct
DROP POLICY IF EXISTS "Allow any authenticated user to create organizations" ON public.organizations;

CREATE POLICY "Allow authenticated users to create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

-- Also ensure proper organization viewing
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;

CREATE POLICY "Users can view their organization"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid() OR
  id IN (
    SELECT organization_id 
    FROM public.user_organizations 
    WHERE user_id = auth.uid() AND is_active = true
  )
);