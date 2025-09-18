-- Create function to check if this is the first user signup (should be admin)
CREATE OR REPLACE FUNCTION public.is_first_user_signup()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_count integer;
BEGIN
  -- Count total users with confirmed emails
  SELECT COUNT(*)::integer INTO user_count 
  FROM auth.users 
  WHERE email_confirmed_at IS NOT NULL;
  
  -- If no confirmed users exist, this is the first user
  RETURN user_count = 0;
END;
$$;

-- Create function to determine appropriate role for new user
CREATE OR REPLACE FUNCTION public.get_appropriate_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- First user should be admin
  IF public.is_first_user_signup() THEN
    RETURN 'admin';
  ELSE
    RETURN 'manager';
  END IF;
END;
$$;