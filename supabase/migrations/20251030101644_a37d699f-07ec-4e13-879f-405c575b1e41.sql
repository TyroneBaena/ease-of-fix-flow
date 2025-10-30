-- Fix Security Issue 1: Restrict profiles table SELECT policy
-- Only allow users to view their own profile OR admins to view profiles in their org

DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;

CREATE POLICY "Users can view their own profile or admins can view org profiles"
ON public.profiles
FOR SELECT
USING (
  -- Users can always see their own profile
  id = auth.uid()
  OR
  -- Admins can see all profiles in their organization
  (
    get_current_user_role_safe() = 'admin'
    AND organization_id = get_current_user_organization_safe()
  )
);

-- Fix Security Issue 2: Restrict email_relay_keys to intended recipients only
-- Only the user whose email matches recipient_email can view the token

DROP POLICY IF EXISTS "Users can view email relay keys in their organization" ON public.email_relay_keys;

CREATE POLICY "Only intended recipients can view email relay keys"
ON public.email_relay_keys
FOR SELECT
USING (
  -- Only users whose email matches the recipient_email can view the token
  recipient_email = (
    SELECT email 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
  AND is_active = true
  AND expires_at > now()
);