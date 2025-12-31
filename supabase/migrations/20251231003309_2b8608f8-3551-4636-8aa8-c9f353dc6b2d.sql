-- Phase B, Migration 2: Add AI categorization columns to maintenance_requests
-- Using DO block with IF NOT EXISTS logic for safety

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'maintenance_requests' AND column_name = 'ai_issue_type') THEN
    ALTER TABLE public.maintenance_requests ADD COLUMN ai_issue_type text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'maintenance_requests' AND column_name = 'ai_issue_tags') THEN
    ALTER TABLE public.maintenance_requests ADD COLUMN ai_issue_tags text[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'maintenance_requests' AND column_name = 'ai_affected_area') THEN
    ALTER TABLE public.maintenance_requests ADD COLUMN ai_affected_area text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'maintenance_requests' AND column_name = 'ai_categorized_at') THEN
    ALTER TABLE public.maintenance_requests ADD COLUMN ai_categorized_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'maintenance_requests' AND column_name = 'ai_category_confidence') THEN
    ALTER TABLE public.maintenance_requests ADD COLUMN ai_category_confidence text;
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.maintenance_requests.ai_issue_type IS 'AI-categorized issue type (e.g., plumbing, electrical, hvac)';
COMMENT ON COLUMN public.maintenance_requests.ai_issue_tags IS 'AI-generated tags for the issue';
COMMENT ON COLUMN public.maintenance_requests.ai_affected_area IS 'AI-identified affected area of the property';
COMMENT ON COLUMN public.maintenance_requests.ai_categorized_at IS 'Timestamp when AI categorization was performed';
COMMENT ON COLUMN public.maintenance_requests.ai_category_confidence IS 'Confidence level of AI categorization (high, medium, low)';