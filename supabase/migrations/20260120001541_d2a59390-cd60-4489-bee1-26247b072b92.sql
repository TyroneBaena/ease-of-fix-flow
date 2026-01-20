-- Add unique constraint for property insights upsert
-- This fixes the "42P10" error: "there is no unique or exclusion constraint matching the ON CONFLICT specification"
ALTER TABLE property_insights
ADD CONSTRAINT property_insights_property_id_insight_type_key 
UNIQUE (property_id, insight_type);