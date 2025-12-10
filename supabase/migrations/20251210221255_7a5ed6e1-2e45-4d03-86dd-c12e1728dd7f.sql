-- Create housemates table
CREATE TABLE public.housemates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  rent_utilities_amount NUMERIC,
  rent_period TEXT NOT NULL DEFAULT 'week' CHECK (rent_period IN ('week', 'fortnight', 'month')),
  personal_profile TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.housemates ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for organization-based access
CREATE POLICY "Users can manage housemates in their organization"
ON public.housemates
FOR ALL
USING (organization_id = get_current_user_organization_safe())
WITH CHECK (organization_id = get_current_user_organization_safe());

-- Create indexes for performance
CREATE INDEX idx_housemates_property_id ON public.housemates(property_id);
CREATE INDEX idx_housemates_organization_id ON public.housemates(organization_id);
CREATE INDEX idx_housemates_is_archived ON public.housemates(is_archived);

-- Create trigger for updated_at
CREATE TRIGGER update_housemates_updated_at
  BEFORE UPDATE ON public.housemates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();