-- Fix tuqolo@forexnews.bg user organization setup
UPDATE public.profiles 
SET organization_id = (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = (SELECT id FROM profiles WHERE email = 'tuqolo@forexnews.bg')
    AND is_active = true
    LIMIT 1
),
session_organization_id = (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = (SELECT id FROM profiles WHERE email = 'tuqolo@forexnews.bg')
    AND is_active = true
    LIMIT 1
),
role = (
    SELECT role 
    FROM user_organizations 
    WHERE user_id = (SELECT id FROM profiles WHERE email = 'tuqolo@forexnews.bg')
    AND is_active = true
    LIMIT 1
)
WHERE email = 'tuqolo@forexnews.bg';

-- Also update the invite-contractor function to handle the organization context better
-- Let's also fix the trigger that's causing the issue by making it more flexible