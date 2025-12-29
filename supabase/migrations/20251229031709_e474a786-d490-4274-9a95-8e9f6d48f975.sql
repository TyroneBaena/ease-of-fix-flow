-- Add ownership_type column to properties table
ALTER TABLE public.properties
ADD COLUMN ownership_type text DEFAULT 'rented'
CONSTRAINT properties_ownership_type_check CHECK (ownership_type IN ('sda', 'rented', 'owned'));