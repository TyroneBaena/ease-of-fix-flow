-- Create table for tracking public link access
CREATE TABLE public_link_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  property_id UUID NOT NULL,
  property_name TEXT,
  access_type TEXT NOT NULL, -- 'page_view' | 'request_submitted'
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public_link_access_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view their organization's public link access logs
CREATE POLICY "Admins can view public link access logs"
  ON public_link_access_logs FOR SELECT
  USING (
    organization_id = get_current_user_organization_safe() 
    AND get_current_user_role_safe() = 'admin'
  );

-- Create index for efficient querying by organization and date
CREATE INDEX idx_public_link_access_logs_org_created 
  ON public_link_access_logs(organization_id, created_at DESC);

-- Create index for property-based queries
CREATE INDEX idx_public_link_access_logs_property 
  ON public_link_access_logs(property_id, created_at DESC);