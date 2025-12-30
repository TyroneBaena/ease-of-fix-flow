-- Add submission_method column to maintenance_requests
ALTER TABLE maintenance_requests 
ADD COLUMN IF NOT EXISTS submission_method text DEFAULT 'form';

COMMENT ON COLUMN maintenance_requests.submission_method IS 'How the request was submitted: form, ai_assistant, public_form, public_ai_assistant';

-- Create app_activity_logs table for tracking user activity
CREATE TABLE IF NOT EXISTS app_activity_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text,
  user_email text,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_name text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own activity
CREATE POLICY "Users can insert their own activity" ON app_activity_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policy: Admins can view organization activity
CREATE POLICY "Admins can view organization activity" ON app_activity_logs
  FOR SELECT USING (
    organization_id = get_current_user_organization_safe() 
    AND get_current_user_role_safe() = 'admin'
  );

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_app_activity_org_created ON app_activity_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_activity_user ON app_activity_logs(user_id, created_at DESC);