-- Create a function to initialize user profile if missing
CREATE OR REPLACE FUNCTION public.initialize_user_profile(
  user_id_param uuid,
  email_param text,
  name_param text DEFAULT NULL,
  organization_id_param uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  profile_id uuid;
BEGIN
  -- Check if profile already exists
  SELECT id INTO profile_id
  FROM public.profiles
  WHERE id = user_id_param;
  
  -- If profile doesn't exist, create it
  IF profile_id IS NULL THEN
    INSERT INTO public.profiles (
      id,
      email,
      name,
      role,
      organization_id,
      created_at,
      updated_at
    ) VALUES (
      user_id_param,
      email_param,
      COALESCE(name_param, split_part(email_param, '@', 1)),
      CASE WHEN organization_id_param IS NOT NULL THEN 'admin' ELSE 'manager' END,
      organization_id_param,
      now(),
      now()
    )
    RETURNING id INTO profile_id;
    
    RAISE LOG 'Created profile for user: %, organization: %', email_param, organization_id_param;
  ELSE
    -- If profile exists but missing organization, update it
    IF organization_id_param IS NOT NULL THEN
      UPDATE public.profiles 
      SET organization_id = organization_id_param,
          role = 'admin',
          updated_at = now()
      WHERE id = user_id_param 
      AND organization_id IS NULL;
      
      RAISE LOG 'Updated profile organization for user: %', email_param;
    END IF;
  END IF;
  
  RETURN profile_id;
END;
$$;