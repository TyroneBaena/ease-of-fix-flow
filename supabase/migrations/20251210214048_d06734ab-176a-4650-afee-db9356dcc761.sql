-- Create property_notes table
CREATE TABLE public.property_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  user_id UUID NOT NULL,
  note_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policy for organization-based access
CREATE POLICY "Users can manage notes in their organization"
  ON public.property_notes FOR ALL
  USING (organization_id = get_current_user_organization_safe())
  WITH CHECK (organization_id = get_current_user_organization_safe());

-- Indexes for performance
CREATE INDEX idx_property_notes_property_id ON property_notes(property_id);
CREATE INDEX idx_property_notes_organization_id ON property_notes(organization_id);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_property_notes
  BEFORE UPDATE ON property_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();