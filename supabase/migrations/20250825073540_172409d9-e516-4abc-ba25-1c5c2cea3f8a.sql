-- Fix the create_comment_notifications function to properly handle contractor user_id
CREATE OR REPLACE FUNCTION public.create_comment_notifications(request_id_param uuid, comment_text text, commenter_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_record RECORD;
  admin_user RECORD;
  contractor_user_id uuid;  -- Changed from RECORD to uuid
  notification_title TEXT;
  notification_message TEXT;
  notification_link TEXT;
BEGIN
  -- Get request details
  SELECT * INTO request_record 
  FROM public.maintenance_requests 
  WHERE id = request_id_param;
  
  IF request_record IS NULL THEN
    RETURN;
  END IF;
  
  -- Prepare notification content
  notification_title := 'New Comment on Request';
  notification_message := commenter_name || ' commented: "' || LEFT(comment_text, 100) || 
    CASE WHEN LENGTH(comment_text) > 100 THEN '..."' ELSE '"' END;
  notification_link := '/requests/' || request_id_param;
  
  -- Notify all admins
  FOR admin_user IN 
    SELECT id FROM public.profiles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (admin_user.id, notification_title, notification_message, 'info', notification_link);
  END LOOP;
  
  -- Notify the request submitter (if not the commenter)
  IF request_record.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (request_record.user_id, notification_title, notification_message, 'info', notification_link)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Notify assigned contractor (if exists and different from commenter)
  IF request_record.contractor_id IS NOT NULL THEN
    SELECT user_id INTO contractor_user_id  -- Get just the user_id, not the whole record
    FROM public.contractors 
    WHERE id = request_record.contractor_id;
    
    IF contractor_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (contractor_user_id, notification_title, notification_message, 'info', notification_link)  -- Use the uuid, not the record
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
END;
$$;