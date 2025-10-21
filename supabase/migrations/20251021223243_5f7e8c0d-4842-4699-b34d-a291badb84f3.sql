-- Create app_settings table to store application-wide settings per organization
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  google_maps_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their organization's settings
CREATE POLICY "Users can view their organization settings"
ON public.app_settings
FOR SELECT
USING (organization_id = public.get_current_user_organization());

-- Policy: Only admins can update their organization's settings
CREATE POLICY "Admins can update their organization settings"
ON public.app_settings
FOR UPDATE
USING (
  organization_id = public.get_current_user_organization() 
  AND public.get_current_user_role() = 'admin'
)
WITH CHECK (
  organization_id = public.get_current_user_organization() 
  AND public.get_current_user_role() = 'admin'
);

-- Policy: Only admins can insert their organization's settings
CREATE POLICY "Admins can insert their organization settings"
ON public.app_settings
FOR INSERT
WITH CHECK (
  organization_id = public.get_current_user_organization() 
  AND public.get_current_user_role() = 'admin'
);

-- Create trigger for updated_at
CREATE TRIGGER set_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Create index for faster lookups
CREATE INDEX idx_app_settings_organization_id ON public.app_settings(organization_id);