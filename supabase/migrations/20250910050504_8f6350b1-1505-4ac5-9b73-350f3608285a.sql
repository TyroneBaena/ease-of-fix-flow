-- Fix organization membership inconsistencies without duplicates

-- Delete duplicate organization memberships first, keeping only the default one
DELETE FROM public.user_organizations uo1
WHERE EXISTS (
  SELECT 1 FROM public.user_organizations uo2
  WHERE uo1.user_id = uo2.user_id
  AND uo1.organization_id = uo2.organization_id
  AND uo1.id != uo2.id
  AND uo2.is_default = true
  AND uo1.is_default = false
);

-- Update user profiles to match their default organization membership
UPDATE public.profiles p
SET organization_id = uo.organization_id,
    session_organization_id = uo.organization_id
FROM public.user_organizations uo
WHERE p.id = uo.user_id 
AND uo.is_default = true
AND uo.is_active = true
AND (p.organization_id != uo.organization_id OR p.organization_id IS NULL);

-- Create missing organization memberships
INSERT INTO public.user_organizations (user_id, organization_id, role, is_active, is_default)
SELECT DISTINCT p.id, p.organization_id, p.role, true, 
       CASE WHEN NOT EXISTS (
         SELECT 1 FROM public.user_organizations uo 
         WHERE uo.user_id = p.id AND uo.is_default = true
       ) THEN true ELSE false END
FROM public.profiles p
WHERE p.organization_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.user_organizations uo 
  WHERE uo.user_id = p.id 
  AND uo.organization_id = p.organization_id
);