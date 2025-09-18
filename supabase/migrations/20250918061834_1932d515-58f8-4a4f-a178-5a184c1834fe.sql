-- Fix the role assignment logic
-- The issue is that is_first_user_signup() checks the entire system, 
-- but we need to check if this is the first user for a NEW organization

-- Updated function to determine if this signup should create a new organization
-- (and therefore the user should be admin)
CREATE OR REPLACE FUNCTION public.is_first_user_signup()
RETURNS BOOLEAN AS $$
BEGIN
    -- For now, every new signup creates their own organization and becomes admin
    -- This matches the Phase 3 requirement where each user gets their own organization
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated function to get appropriate user role
-- Since every user creates their own organization, they should all be admins
CREATE OR REPLACE FUNCTION public.get_appropriate_user_role()
RETURNS TEXT AS $$
BEGIN
    -- In Phase 3, every user creates their own organization and becomes admin
    RETURN 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also, let's update the existing "manager" user to be an admin since they created their own org
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'satog13572@fanwn.com' AND role = 'manager';

-- Log the update
DO $$
BEGIN
    RAISE LOG 'Updated satog13572@fanwn.com role from manager to admin';
END $$;