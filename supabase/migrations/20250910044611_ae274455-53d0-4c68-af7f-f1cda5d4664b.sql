-- Install all missing critical triggers for organization security

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

-- 4. Trigger for ensuring organization access on all records
CREATE TRIGGER ensure_organization_access_properties
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW 
  EXECUTE FUNCTION public.ensure_user_organization_access();

CREATE TRIGGER ensure_organization_access_contractors
  BEFORE INSERT OR UPDATE ON public.contractors
  FOR EACH ROW 
  EXECUTE FUNCTION public.ensure_user_organization_access();

CREATE TRIGGER ensure_organization_access_notifications
  BEFORE INSERT OR UPDATE ON public.notifications
  FOR EACH ROW 
  EXECUTE FUNCTION public.ensure_user_organization_access();

-- 5. Trigger for activity logs organization assignment
CREATE TRIGGER ensure_activity_log_organization_trigger
  BEFORE INSERT OR UPDATE ON public.activity_logs
  FOR EACH ROW 
  EXECUTE FUNCTION public.ensure_activity_log_organization();

-- 6. Trigger for comment notifications (using v2 for email support)
CREATE TRIGGER handle_new_comment_trigger
  AFTER INSERT ON public.comments
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_comment_v2();

-- 7. Trigger for new user organization creation
CREATE TRIGGER create_organization_for_new_user_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW 
  EXECUTE FUNCTION public.create_organization_for_new_user();

-- 8. Trigger for user organization membership creation
CREATE TRIGGER create_user_organization_membership_trigger
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW 
  EXECUTE FUNCTION public.create_user_organization_membership();

-- 9. Set organization on budget categories
CREATE TRIGGER set_budget_category_organization_trigger
  BEFORE INSERT OR UPDATE ON public.budget_categories
  FOR EACH ROW 
  EXECUTE FUNCTION public.set_budget_category_organization();