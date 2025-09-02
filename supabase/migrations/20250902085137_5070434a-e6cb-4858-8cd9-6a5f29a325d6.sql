-- Fix security definer functions by setting proper search path
-- Update all functions to have SET search_path for security

ALTER FUNCTION public.set_updated_at() SET search_path = 'public';
ALTER FUNCTION public.test_logging() SET search_path = 'public';
ALTER FUNCTION public.auto_assign_property_to_creator() SET search_path = 'public';
ALTER FUNCTION public.log_contractor_access(uuid) SET search_path = 'public';
ALTER FUNCTION public.set_organization_id() SET search_path = 'public';
ALTER FUNCTION public.create_organization_for_new_user() SET search_path = 'public';
ALTER FUNCTION public.send_comment_email_notification(uuid, text, text, text) SET search_path = 'public';
ALTER FUNCTION public.handle_new_comment() SET search_path = 'public';
ALTER FUNCTION public.get_user_schema() SET search_path = 'public';
ALTER FUNCTION public.handle_new_user() SET search_path = 'public';
ALTER FUNCTION public.handle_new_user_schema() SET search_path = 'public';
ALTER FUNCTION public.set_user_id() SET search_path = 'public';
ALTER FUNCTION public.add_new_comment(text, text, text, text, text) SET search_path = 'public';
ALTER FUNCTION public.create_tenant_schema(uuid, text) SET search_path = 'public';
ALTER FUNCTION public.create_comment_notifications(uuid, text, text) SET search_path = 'public';
ALTER FUNCTION public.get_property_maintenance_spend(uuid, integer) SET search_path = 'public';
ALTER FUNCTION public.meta_to_array(jsonb) SET search_path = 'public';
ALTER FUNCTION public.use_tenant_schema(text) SET search_path = 'public';