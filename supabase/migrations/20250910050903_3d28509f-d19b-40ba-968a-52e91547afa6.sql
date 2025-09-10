-- Fix remaining organization membership issue for qoluzupu@forexnews.bg

-- Remove the non-default organization membership for this user
DELETE FROM public.user_organizations 
WHERE user_id = (
  SELECT id FROM public.profiles WHERE email = 'qoluzupu@forexnews.bg'
)
AND is_default = false;

-- Ensure this user only has one organization membership that matches their profile
UPDATE public.user_organizations 
SET is_default = true, is_active = true
WHERE user_id = (
  SELECT id FROM public.profiles WHERE email = 'qoluzupu@forexnews.bg'
)
AND organization_id = (
  SELECT organization_id FROM public.profiles WHERE email = 'qoluzupu@forexnews.bg'
);