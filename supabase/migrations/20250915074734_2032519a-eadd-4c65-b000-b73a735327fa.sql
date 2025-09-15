-- First, create the missing profile for the existing user
INSERT INTO profiles (id, email, name, role, organization_id, session_organization_id, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) as name,
  'admin' as role,  -- User created organization so should be admin
  uo.organization_id,
  uo.organization_id,
  u.created_at,
  NOW()
FROM auth.users u
JOIN user_organizations uo ON u.id = uo.user_id
WHERE u.id = '9c8a677a-51fd-466e-b29d-3f49a8801e34'
  AND uo.is_active = true
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = u.id);

-- Create or replace the trigger function to automatically create profiles for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'manager'),
    NEW.created_at,
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists to create profiles for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();