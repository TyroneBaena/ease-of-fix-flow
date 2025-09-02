-- Fix notifications missing organization_id
UPDATE public.notifications 
SET organization_id = (
  SELECT p.organization_id 
  FROM profiles p 
  WHERE p.id = notifications.user_id
)
WHERE organization_id IS NULL 
AND user_id IS NOT NULL;