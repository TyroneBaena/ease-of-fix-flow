-- Fix cross-organization notification leak by updating notification functions

-- Update the create_comment_notifications function to respect organization boundaries
CREATE OR REPLACE FUNCTION public.create_comment_notifications(request_id_param uuid, comment_text text, commenter_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_record RECORD;
  admin_user RECORD;
  contractor_user_id uuid;
  notification_title TEXT;
  notification_message TEXT;
  notification_link TEXT;
  request_org_id uuid;
BEGIN
  -- Get request details including organization
  SELECT mr.*, mr.organization_id INTO request_record 
  FROM public.maintenance_requests mr
  WHERE mr.id = request_id_param;
  
  IF request_record IS NULL THEN
    RETURN;
  END IF;
  
  request_org_id := request_record.organization_id;
  
  -- Prepare notification content
  notification_title := 'New Comment on Request';
  notification_message := commenter_name || ' commented: "' || LEFT(comment_text, 100) || 
    CASE WHEN LENGTH(comment_text) > 100 THEN '..."' ELSE '"' END;
  notification_link := '/requests/' || request_id_param;
  
  -- Notify only admins in the SAME organization
  FOR admin_user IN 
    SELECT id FROM public.profiles 
    WHERE role = 'admin' 
    AND organization_id = request_org_id
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link, organization_id)
    VALUES (admin_user.id, notification_title, notification_message, 'info', notification_link, request_org_id);
  END LOOP;
  
  -- Notify the request submitter (if in same organization)
  IF request_record.user_id IS NOT NULL THEN
    -- Verify user is in same organization before sending notification
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = request_record.user_id AND organization_id = request_org_id) THEN
      INSERT INTO public.notifications (user_id, title, message, type, link, organization_id)
      VALUES (request_record.user_id, notification_title, notification_message, 'info', notification_link, request_org_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  -- Notify assigned contractor (if exists and in same organization)
  IF request_record.contractor_id IS NOT NULL THEN
    SELECT c.user_id INTO contractor_user_id
    FROM public.contractors c
    WHERE c.id = request_record.contractor_id
    AND c.organization_id = request_org_id;
    
    IF contractor_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, link, organization_id)
      VALUES (contractor_user_id, notification_title, notification_message, 'info', notification_link, request_org_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
END;
$$;