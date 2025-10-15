-- Create invitation codes table for team management
CREATE TABLE public.invitation_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_role TEXT NOT NULL DEFAULT 'manager',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  internal_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_role CHECK (assigned_role IN ('admin', 'manager', 'contractor'))
);

-- Enable RLS
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

-- Admins can manage invitation codes in their organization
CREATE POLICY "Admins can manage invitation codes"
ON public.invitation_codes
FOR ALL
TO authenticated
USING (
  organization_id = get_current_user_organization_safe() 
  AND get_current_user_role_safe() = 'admin'
)
WITH CHECK (
  organization_id = get_current_user_organization_safe() 
  AND get_current_user_role_safe() = 'admin'
);

-- Anyone can read active invitation codes to validate them
CREATE POLICY "Anyone can read active invitation codes for validation"
ON public.invitation_codes
FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND expires_at > now() 
  AND current_uses < max_uses
);

-- Create index for faster code lookups
CREATE INDEX idx_invitation_codes_code ON public.invitation_codes(code);
CREATE INDEX idx_invitation_codes_organization ON public.invitation_codes(organization_id);

-- Add trigger for updated_at
CREATE TRIGGER set_invitation_codes_updated_at
  BEFORE UPDATE ON public.invitation_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Create table to track who used which invitation code
CREATE TABLE public.invitation_code_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_code_id UUID NOT NULL REFERENCES public.invitation_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(invitation_code_id, user_id)
);

-- Enable RLS on usage tracking
ALTER TABLE public.invitation_code_usage ENABLE ROW LEVEL SECURITY;

-- Admins can view usage in their organization
CREATE POLICY "Admins can view invitation code usage"
ON public.invitation_code_usage
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invitation_codes ic
    WHERE ic.id = invitation_code_usage.invitation_code_id
    AND ic.organization_id = get_current_user_organization_safe()
    AND get_current_user_role_safe() = 'admin'
  )
);

-- System can insert usage records
CREATE POLICY "System can insert usage records"
ON public.invitation_code_usage
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());