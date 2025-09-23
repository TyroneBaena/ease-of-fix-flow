-- Create a public function to get budget categories for a specific property
CREATE OR REPLACE FUNCTION public.get_public_property_budget_categories(property_uuid uuid)
 RETURNS TABLE(id uuid, name text, description text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  property_org_id uuid;
BEGIN
  -- Get the property's organization ID
  SELECT organization_id INTO property_org_id
  FROM public.properties
  WHERE id = property_uuid;
  
  IF property_org_id IS NULL THEN
    RAISE EXCEPTION 'Property not found or has no organization';
  END IF;
  
  -- Return budget categories for this organization
  RETURN QUERY
  SELECT 
    bc.id,
    bc.name,
    bc.description
  FROM public.budget_categories bc
  WHERE bc.organization_id = property_org_id
  ORDER BY bc.name;
  
  -- Log function usage
  RAISE LOG 'Public budget categories accessed for property: %, organization: %', property_uuid, property_org_id;
END;
$function$