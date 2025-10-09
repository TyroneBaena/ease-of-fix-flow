-- Backfill organization_id for existing security events by matching user_id to profiles
UPDATE public.security_events se
SET organization_id = p.organization_id
FROM public.profiles p
WHERE se.user_id = p.id
  AND se.organization_id IS NULL
  AND p.organization_id IS NOT NULL;

-- For events without user_id, try to match by email
UPDATE public.security_events se
SET organization_id = p.organization_id
FROM public.profiles p
WHERE se.user_email = p.email
  AND se.organization_id IS NULL
  AND se.user_id IS NULL
  AND p.organization_id IS NOT NULL;