-- Create missing profile for the authenticated user
-- Simple version without organization creation

INSERT INTO public.profiles (
    id, 
    email, 
    name, 
    role, 
    organization_id,
    session_organization_id,
    assigned_properties,
    created_at,
    updated_at
) 
SELECT 
    'a4628b24-b181-4e98-b7d1-8ece91971496',
    'pakoli@cyclelove.cc',
    'User Account 1',
    'admin',
    uo.organization_id,
    uo.organization_id, -- Set session org immediately
    ARRAY[]::TEXT[],
    now(),
    now()
FROM public.user_organizations uo 
WHERE uo.user_id = 'a4628b24-b181-4e98-b7d1-8ece91971496' 
AND uo.is_active = true
AND uo.is_default = true
LIMIT 1
ON CONFLICT (id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    session_organization_id = EXCLUDED.session_organization_id,
    updated_at = now();