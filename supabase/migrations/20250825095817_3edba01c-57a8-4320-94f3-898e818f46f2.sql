-- Disable the database triggers for email notifications since we're now handling emails from frontend
-- Keep the in-app notification trigger but remove the email notification call

CREATE OR REPLACE FUNCTION public.handle_new_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Create in-app notifications only (email notifications now handled by frontend)
  PERFORM public.create_comment_notifications(
    NEW.request_id,
    NEW.text,
    NEW.user_name
  );
  
  RETURN NEW;
END;
$function$;