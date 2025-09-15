-- Fix organization creation for unconfirmed users
-- The issue is that unconfirmed users might not pass RLS checks properly

-- Create a more robust debug function
CREATE OR REPLACE FUNCTION public.debug_user_auth_status()
RETURNS TABLE(
  current_user_id uuid,
  is_authenticated boolean,
  email_confirmed boolean,
  can_create_org boolean
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  auth_user_id uuid;
  user_record RECORD;
BEGIN
  -- Get the auth user ID
  auth_user_id := auth.uid();
  
  -- Get user details from auth.users if we can
  SELECT u.email_confirmed_at INTO user_record
  FROM auth.users u 
  WHERE u.id = auth_user_id;
  
  RETURN QUERY
  SELECT 
    auth_user_id,
    auth_user_id IS NOT NULL,
    user_record.email_confirmed_at IS NOT NULL,
    auth_user_id IS NOT NULL -- Can create org if authenticated, regardless of email confirmation
  ;
END;
$$;

-- Create a simpler, more permissive organization creation policy
DROP POLICY IF EXISTS "Allow authenticated users to create organizations" ON public.organizations;

-- Allow any authenticated user (confirmed or unconfirmed) to create organizations
CREATE POLICY "Allow any authenticated user to create organizations" 
ON public.organizations 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = created_by
);

-- Add logging to help debug
CREATE OR REPLACE FUNCTION public.log_organization_creation() 
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  RAISE LOG 'Organization creation attempt: user_id=%, org_name=%, auth_uid=%', 
    NEW.created_by, NEW.name, auth.uid();
  
  IF auth.uid() IS NULL THEN
    RAISE LOG 'FAILED: No authenticated user';
    RAISE EXCEPTION 'No authenticated user found';
  END IF;
  
  IF auth.uid() != NEW.created_by THEN
    RAISE LOG 'FAILED: User mismatch - auth.uid()=%, created_by=%', auth.uid(), NEW.created_by;
    RAISE EXCEPTION 'User ID mismatch';
  END IF;
  
  RAISE LOG 'SUCCESS: Organization creation approved';
  RETURN NEW;
END;
$$;

-- Add trigger for debugging organization creation
DROP TRIGGER IF EXISTS organization_creation_debug ON public.organizations;
CREATE TRIGGER organization_creation_debug
  BEFORE INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.log_organization_creation();