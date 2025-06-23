
-- Function to create notifications for comment events
CREATE OR REPLACE FUNCTION public.create_comment_notifications(
  request_id_param UUID,
  comment_text TEXT,
  commenter_name TEXT
) RETURNS void AS $$
DECLARE
  request_record RECORD;
  admin_user RECORD;
  manager_user RECORD;
  contractor_user RECORD;
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
    SELECT user_id INTO contractor_user 
    FROM public.contractors 
    WHERE id = request_record.contractor_id;
    
    IF contractor_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (contractor_user, notification_title, notification_message, 'info', notification_link)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to trigger comment notifications and emails
CREATE OR REPLACE FUNCTION public.handle_new_comment() 
RETURNS trigger AS $$
BEGIN
  -- Create notifications
  PERFORM public.create_comment_notifications(
    NEW.request_id,
    NEW.text,
    NEW.user_name
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS on_comment_created ON public.comments;
CREATE TRIGGER on_comment_created
  AFTER INSERT ON public.comments
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_comment();

-- Enable real-time for notifications (only if not already enabled)
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
