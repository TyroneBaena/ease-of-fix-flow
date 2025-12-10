-- Add attachments column to property_notes table
ALTER TABLE public.property_notes
ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;