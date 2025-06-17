
-- Add rent_period column to properties table
ALTER TABLE public.properties 
ADD COLUMN rent_period text DEFAULT 'month';

-- Add a constraint to ensure only valid values
ALTER TABLE public.properties 
ADD CONSTRAINT check_rent_period 
CHECK (rent_period IN ('week', 'month'));
