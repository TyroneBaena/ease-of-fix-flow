-- Fix organization membership inconsistencies

-- Fix the user with conflicting organization memberships
-- Update qoluzupu@forexnews.bg to have consistent organization membership

-- First, let's standardize on the organization they're currently in their profile
UPDATE public.user_organizations 
SET organization_id = (
  SELECT organization_id 
  FROM public.profiles 
  WHERE email = 'qoluzupu@forexnews.bg'
)
WHERE user_id = (
  SELECT id 
  FROM public.profiles 
  WHERE email = 'qoluzupu@forexnews.bg'
)
AND organization_id != (
  SELECT organization_id 
  FROM public.profiles 
  WHERE email = 'qoluzupu@forexnews.bg'
);

-- Ensure all users have consistent organization memberships
-- Update any profiles where organization_id doesn't match their default membership
UPDATE public.profiles p
SET organization_id = uo.organization_id,
    session_organization_id = uo.organization_id
FROM public.user_organizations uo
WHERE p.id = uo.user_id 
AND uo.is_default = true
AND uo.is_active = true
AND p.organization_id != uo.organization_id;

-- Ensure all user_organizations entries have matching profiles
INSERT INTO public.user_organizations (user_id, organization_id, role, is_active, is_default)
SELECT p.id, p.organization_id, p.role, true, true
FROM public.profiles p
WHERE p.organization_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.user_organizations uo 
  WHERE uo.user_id = p.id 
  AND uo.organization_id = p.organization_id
)
ON CONFLICT (user_id, organization_id) DO UPDATE SET
  is_active = true,
  role = EXCLUDED.role;