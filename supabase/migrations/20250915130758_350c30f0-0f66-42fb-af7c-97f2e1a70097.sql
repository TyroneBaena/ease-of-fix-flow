-- Create a function to ensure contractor assignments stay within organization boundaries
CREATE OR REPLACE FUNCTION public.ensure_contractor_assignment_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  request_org_id uuid;
  contractor_org_id uuid;
BEGIN
  -- Only validate when contractor_id is being assigned
  IF NEW.contractor_id IS NOT NULL AND OLD.contractor_id IS DISTINCT FROM NEW.contractor_id THEN
    
    -- Get the maintenance request's organization
    request_org_id := NEW.organization_id;
    
    -- Get the contractor's organization  
    SELECT organization_id INTO contractor_org_id
    FROM contractors 
    WHERE id = NEW.contractor_id;
    
    -- Ensure organizations match
    IF request_org_id != contractor_org_id THEN
      RAISE EXCEPTION 'Cannot assign contractor from organization % to request from organization %. Cross-organization assignments are not allowed.', 
        contractor_org_id, request_org_id;
    END IF;
    
    RAISE LOG 'Contractor assignment validated: contractor % from org % assigned to request % in org %', 
      NEW.contractor_id, contractor_org_id, NEW.id, request_org_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to validate contractor assignments
DROP TRIGGER IF EXISTS validate_contractor_assignment_organization ON maintenance_requests;
CREATE TRIGGER validate_contractor_assignment_organization
  BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_contractor_assignment_organization();