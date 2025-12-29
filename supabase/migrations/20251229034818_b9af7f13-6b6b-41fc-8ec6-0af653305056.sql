-- Add columns to store AI responsibility suggestion on maintenance requests
ALTER TABLE public.maintenance_requests
ADD COLUMN ai_responsibility_suggestion text,
ADD COLUMN ai_responsibility_urgency text,
ADD COLUMN ai_responsibility_asset_type text,
ADD COLUMN ai_responsibility_reasoning text,
ADD COLUMN ai_responsibility_confidence text,
ADD COLUMN ai_responsibility_analyzed_at timestamp with time zone;