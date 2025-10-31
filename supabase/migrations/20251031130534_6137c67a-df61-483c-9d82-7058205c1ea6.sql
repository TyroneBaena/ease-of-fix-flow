-- Enable security_invoker on admin_user_list view to inherit RLS from profiles
ALTER VIEW public.admin_user_list SET (security_invoker = true);