-- Update the handle_new_user trigger to assign admin role to first user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_role text := 'manager'; -- default role
BEGIN
  -- Check if this is the first user (should be admin)
  IF public.is_first_user_signup() THEN
    user_role := 'admin';
    RAISE LOG 'First user signup detected - assigning admin role to: %', NEW.email;
  ELSE
    user_role := 'manager';
    RAISE LOG 'Regular user signup - assigning manager role to: %', NEW.email;
  END IF;

  -- Insert profile with appropriate role
  INSERT INTO public.profiles (id, email, name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    user_role,
    NEW.created_at,
    NOW()
  );
  
  RETURN NEW;
END;
$function$;