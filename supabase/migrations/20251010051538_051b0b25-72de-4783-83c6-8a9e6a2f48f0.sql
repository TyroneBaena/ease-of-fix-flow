-- Backfill organization_id for security_events that have NULL organization_id
-- by matching user_email to profiles

UPDATE security_events se
SET organization_id = p.organization_id
FROM profiles p
WHERE se.organization_id IS NULL
  AND se.user_email = p.email
  AND p.organization_id IS NOT NULL;