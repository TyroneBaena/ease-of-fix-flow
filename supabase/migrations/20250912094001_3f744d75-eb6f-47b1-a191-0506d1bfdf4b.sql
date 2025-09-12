-- Add organization_code column to organizations table for Phase 3
ALTER TABLE public.organizations 
ADD COLUMN organization_code TEXT UNIQUE;

-- Add an index for better performance
CREATE INDEX idx_organizations_code ON public.organizations(organization_code);

-- Update existing organizations with default codes (based on their slugs)
UPDATE public.organizations 
SET organization_code = UPPER(SUBSTR(slug, 1, 8))
WHERE organization_code IS NULL;

-- Make organization_code NOT NULL after setting default values
ALTER TABLE public.organizations 
ALTER COLUMN organization_code SET NOT NULL;