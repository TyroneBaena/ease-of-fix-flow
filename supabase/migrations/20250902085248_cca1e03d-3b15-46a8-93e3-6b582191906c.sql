-- Fix remaining security definer functions by setting proper search path
ALTER FUNCTION public.get_current_user_organization() SET search_path = 'public';
ALTER FUNCTION public.get_current_user_role() SET search_path = 'public';
ALTER FUNCTION public.get_contractor_id() SET search_path = 'public';
ALTER FUNCTION public.get_contractor_user_id(uuid) SET search_path = 'public';
ALTER FUNCTION public.get_current_financial_year() SET search_path = 'public';
ALTER FUNCTION public.is_admin() SET search_path = 'public';
ALTER FUNCTION public.is_contractor() SET search_path = 'public';
ALTER FUNCTION public.is_contractor_user() SET search_path = 'public';
ALTER FUNCTION public.user_has_property_access(uuid) SET search_path = 'public';
ALTER FUNCTION public.get_user_role_for_maintenance() SET search_path = 'public';