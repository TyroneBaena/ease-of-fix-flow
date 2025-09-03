-- Fix organization assignment for John Manager
-- Update his profile to reflect the organization he was invited to

UPDATE public.profiles 
SET 
  organization_id = 'aebcc3ab-5aa6-4c82-a075-a7d130866a12',
  session_organization_id = 'aebcc3ab-5aa6-4c82-a075-a7d130866a12',
  updated_at = now()
WHERE id = '37512f65-d50e-42fc-89e8-d50d7ea0c8ee'
  AND email = 'qoluzupu@forexnews.bg';