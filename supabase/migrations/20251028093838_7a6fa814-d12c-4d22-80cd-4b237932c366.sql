-- Fix Security Issue #1: Restrict subscriber payment data to admins only
DROP POLICY IF EXISTS "Users can view their organization subscription" ON public.subscribers;

CREATE POLICY "Only admins can view organization subscription"
ON public.subscribers
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM user_organizations uo
    WHERE uo.user_id = auth.uid()
      AND uo.organization_id = subscribers.organization_id
      AND uo.role = 'admin'
      AND uo.is_active = true
  )
);

-- Fix Security Issue #2: Remove public access to invitation codes
DROP POLICY IF EXISTS "Anyone can read active invitation codes for validation" ON public.invitation_codes;

-- Create a secure function for invitation code validation
CREATE OR REPLACE FUNCTION public.validate_invitation_code(code_input text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code_record record;
BEGIN
  SELECT 
    id,
    organization_id,
    assigned_role,
    max_uses,
    current_uses,
    expires_at,
    is_active
  INTO code_record
  FROM invitation_codes
  WHERE code = code_input
    AND is_active = true
    AND expires_at > now()
    AND current_uses < max_uses;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Invalid or expired invitation code'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'code_id', code_record.id,
    'organization_id', code_record.organization_id,
    'assigned_role', code_record.assigned_role
  );
END;
$$;

-- Fix Security Issue #3: Add more granular contractor access control
-- Keep existing policy but add comment explaining the business justification
COMMENT ON POLICY "Users can manage contractors in their organization" ON public.contractors IS 
'Allows organization members to view and manage contractors. This is required for the maintenance request workflow where users need to assign contractors to jobs. Access is properly restricted to organization members only.';

-- Add a new policy to restrict contractor creation to admins/managers only
DROP POLICY IF EXISTS "Users can manage contractors in their organization" ON public.contractors;

CREATE POLICY "Users can view contractors in their organization"
ON public.contractors
FOR SELECT
USING (organization_id = get_current_user_organization_safe());

CREATE POLICY "Admins and managers can manage contractors"
ON public.contractors
FOR ALL
USING (
  organization_id = get_current_user_organization_safe() 
  AND get_current_user_role_safe() IN ('admin', 'manager')
)
WITH CHECK (
  organization_id = get_current_user_organization_safe() 
  AND get_current_user_role_safe() IN ('admin', 'manager')
);