-- Fix the organization assignment for the manager
-- Move manager 1 to the same organization as the property they're assigned to
UPDATE public.profiles 
SET organization_id = '671e7cee-97b7-4749-91a7-71d7b5e85134'
WHERE id = '7468916e-0b37-428e-8a7e-ed57b9f5623c';