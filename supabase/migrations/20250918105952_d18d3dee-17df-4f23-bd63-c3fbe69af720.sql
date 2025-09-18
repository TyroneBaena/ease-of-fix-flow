-- Create a simple debug function to check current user and role from edge function perspective
CREATE OR REPLACE FUNCTION public.debug_current_user_for_security()
RETURNS TABLE(user_id uuid, user_email text, user_role text, is_authenticated boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as user_id,
    (SELECT email FROM public.profiles WHERE id = auth.uid()) as user_email,
    (SELECT role FROM public.profiles WHERE id = auth.uid()) as user_role,
    auth.uid() IS NOT NULL as is_authenticated;
END;
$$;