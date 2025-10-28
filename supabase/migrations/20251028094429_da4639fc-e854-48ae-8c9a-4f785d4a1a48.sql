-- URGENT: Revert the overly restrictive subscribers policy
-- The original policy was correct - all organization members need to see subscription status
DROP POLICY IF EXISTS "Only admins can view organization subscription" ON public.subscribers;

-- Restore the original policy that allows organization members to view their subscription
CREATE POLICY "Users can view their organization subscription"
ON public.subscribers
FOR SELECT
USING (
  organization_id IN (
    SELECT user_organizations.organization_id
    FROM user_organizations
    WHERE user_organizations.user_id = auth.uid()
      AND user_organizations.is_active = true
  )
);

-- Keep the secure admin-only policies for sensitive operations
-- (INSERT and UPDATE policies already exist and are properly restricted)