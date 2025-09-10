-- Create only the missing critical security triggers

-- 1. Trigger for validating contractor assignments on maintenance requests
CREATE TRIGGER validate_contractor_assignment_trigger
  BEFORE INSERT OR UPDATE ON public.maintenance_requests
  FOR EACH ROW 
  EXECUTE FUNCTION public.validate_contractor_request_organization();

-- 2. Trigger for validating quotes organization consistency  
CREATE TRIGGER validate_quote_organization_trigger
  BEFORE INSERT OR UPDATE ON public.quotes
  FOR EACH ROW 
  EXECUTE FUNCTION public.validate_quote_organization();

-- 3. Trigger for validating job schedules organization consistency
CREATE TRIGGER validate_job_schedule_organization_trigger
  BEFORE INSERT OR UPDATE ON public.job_schedules
  FOR EACH ROW 
  EXECUTE FUNCTION public.validate_job_schedule_organization();