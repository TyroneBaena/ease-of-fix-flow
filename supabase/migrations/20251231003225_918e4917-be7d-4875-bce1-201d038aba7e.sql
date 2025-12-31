-- Phase A: Create the update_updated_at_column function only
-- This is a minimal migration to verify the tool is working correctly

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;