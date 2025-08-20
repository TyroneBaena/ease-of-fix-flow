-- Function to automatically assign property to creator
CREATE OR REPLACE FUNCTION auto_assign_property_to_creator()
RETURNS trigger AS $$
BEGIN
  -- Update the creator's profile to include this property in assigned_properties
  UPDATE public.profiles 
  SET assigned_properties = COALESCE(assigned_properties, '{}') || array[NEW.id::text]
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-assign properties
DROP TRIGGER IF EXISTS auto_assign_property_trigger ON public.properties;
CREATE TRIGGER auto_assign_property_trigger
  AFTER INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_property_to_creator();

-- Fix existing property assignments for the current case
UPDATE public.profiles 
SET assigned_properties = COALESCE(assigned_properties, '{}') || array['aa7c815c-a5f5-41df-9bd8-bf8760decffe'::text]
WHERE id = '3630a985-d6e0-44bd-8950-711ac48341a9'
AND NOT ('aa7c815c-a5f5-41df-9bd8-bf8760decffe' = ANY(COALESCE(assigned_properties, '{}')));

-- Also fix the other property
UPDATE public.profiles 
SET assigned_properties = COALESCE(assigned_properties, '{}') || array['ccc68207-722b-4d38-bb3e-6a887d959302'::text]
WHERE id = '3630a985-d6e0-44bd-8950-711ac48341a9'
AND NOT ('ccc68207-722b-4d38-bb3e-6a887d959302' = ANY(COALESCE(assigned_properties, '{}')));

-- Ensure the profile exists for the manager (create if missing)
INSERT INTO public.profiles (id, email, role, assigned_properties)
SELECT 
  '3630a985-d6e0-44bd-8950-711ac48341a9'::uuid,
  'xycenyma@forexnews.bg',
  'manager',
  array['aa7c815c-a5f5-41df-9bd8-bf8760decffe', 'ccc68207-722b-4d38-bb3e-6a887d959302']
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE id = '3630a985-d6e0-44bd-8950-711ac48341a9'
);