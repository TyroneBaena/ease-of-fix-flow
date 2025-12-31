-- Phase B, Migration 3: Create property_insights table with proper RLS
-- All policies reference get_current_user_organization_safe() and get_current_user_role_safe()
-- NO references to public.users

-- Create the table
CREATE TABLE IF NOT EXISTS public.property_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  insight_type text NOT NULL,
  insight_data jsonb NOT NULL DEFAULT '{}',
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_property_insights_property_id ON public.property_insights(property_id);
CREATE INDEX IF NOT EXISTS idx_property_insights_insight_type ON public.property_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_property_insights_organization_id ON public.property_insights(organization_id);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_property_insights_updated_at ON public.property_insights;
CREATE TRIGGER update_property_insights_updated_at
  BEFORE UPDATE ON public.property_insights
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.property_insights ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for idempotency)
DROP POLICY IF EXISTS "Users can view property insights for their organization" ON public.property_insights;
DROP POLICY IF EXISTS "Admins and managers can insert property insights" ON public.property_insights;
DROP POLICY IF EXISTS "Admins and managers can update property insights" ON public.property_insights;
DROP POLICY IF EXISTS "Admins can delete property insights" ON public.property_insights;

-- Create RLS policies using ONLY the safe helper functions
-- SELECT: Users can view insights for their organization
CREATE POLICY "Users can view property insights for their organization"
  ON public.property_insights
  FOR SELECT
  USING (organization_id = get_current_user_organization_safe());

-- INSERT: Admins and managers can insert
CREATE POLICY "Admins and managers can insert property insights"
  ON public.property_insights
  FOR INSERT
  WITH CHECK (
    organization_id = get_current_user_organization_safe()
    AND get_current_user_role_safe() IN ('admin', 'manager')
  );

-- UPDATE: Admins and managers can update
CREATE POLICY "Admins and managers can update property insights"
  ON public.property_insights
  FOR UPDATE
  USING (
    organization_id = get_current_user_organization_safe()
    AND get_current_user_role_safe() IN ('admin', 'manager')
  );

-- DELETE: Only admins can delete
CREATE POLICY "Admins can delete property insights"
  ON public.property_insights
  FOR DELETE
  USING (
    organization_id = get_current_user_organization_safe()
    AND get_current_user_role_safe() = 'admin'
  );

-- Add comments
COMMENT ON TABLE public.property_insights IS 'Stores AI-generated insights and analytics for properties';
COMMENT ON COLUMN public.property_insights.insight_type IS 'Type of insight (e.g., hotspot_analysis, trend_analysis, cost_prediction)';
COMMENT ON COLUMN public.property_insights.insight_data IS 'JSON data containing the insight details';