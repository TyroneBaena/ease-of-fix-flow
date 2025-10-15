-- Add explicit DELETE policy for invitation codes
-- The existing ALL policy should work, but let's add an explicit one for clarity

DROP POLICY IF EXISTS "Admins can delete invitation codes" ON public.invitation_codes;

CREATE POLICY "Admins can delete invitation codes"
ON public.invitation_codes
FOR DELETE
TO authenticated
USING (
  organization_id = public.get_current_user_organization_safe() 
  AND public.get_current_user_role_safe() = 'admin'
);