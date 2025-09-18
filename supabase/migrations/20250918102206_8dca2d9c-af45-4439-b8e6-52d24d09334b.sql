-- Fix search path for security functions
ALTER FUNCTION public.log_security_event(text, uuid, text, text, text, text, jsonb) SET search_path = public;
ALTER FUNCTION public.get_security_metrics(integer) SET search_path = public;