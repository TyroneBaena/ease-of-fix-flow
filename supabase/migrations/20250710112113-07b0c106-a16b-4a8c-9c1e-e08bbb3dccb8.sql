
-- Create a function to send email notifications for new comments
CREATE OR REPLACE FUNCTION public.send_comment_email_notification(
  p_request_id UUID,
  p_comment_text TEXT,
  p_commenter_name TEXT,
  p_commenter_role TEXT
) RETURNS void AS $$
DECLARE
  request_record RECORD;
  request_owner_record RECORD;
  contractor_record RECORD;
  admin_record RECORD;
  notification_data JSONB;
BEGIN
  -- Get request details
  SELECT mr.*, p.name as property_name, p.address as property_address
  INTO request_record 
  FROM public.maintenance_requests mr
  LEFT JOIN public.properties p ON mr.property_id = p.id
  WHERE mr.id = p_request_id;
  
  IF request_record IS NULL THEN
    RETURN;
  END IF;
  
  -- Prepare notification data
  notification_data := jsonb_build_object(
    'request_id', p_request_id,
    'request_title', request_record.title,
    'request_description', request_record.description,
    'request_location', request_record.location,
    'request_priority', request_record.priority,
    'request_status', request_record.status,
    'property_name', request_record.property_name,
    'property_address', request_record.property_address,
    'comment_text', p_comment_text,
    'commenter_name', p_commenter_name,
    'commenter_role', p_commenter_role,
    'comment_date', now(),
    'direct_link', 'https://ltjlswzrdgtoddyqmydo.supabase.co/requests/' || p_request_id
  );
  
  -- Get request owner details and send notification
  IF request_record.user_id IS NOT NULL THEN
    SELECT pr.name, pr.email INTO request_owner_record
    FROM public.profiles pr
    WHERE pr.id = request_record.user_id;
    
    IF request_owner_record.email IS NOT NULL THEN
      -- Call edge function to send email
      PERFORM net.http_post(
        url := 'https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/send-comment-notification',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key', true) || '"}'::jsonb,
        body := jsonb_build_object(
          'recipient_email', request_owner_record.email,
          'recipient_name', request_owner_record.name,
          'notification_data', notification_data
        )
      );
    END IF;
  END IF;
  
  -- Notify assigned contractor if exists
  IF request_record.contractor_id IS NOT NULL THEN
    SELECT c.contact_name, c.email INTO contractor_record
    FROM public.contractors c
    WHERE c.id = request_record.contractor_id;
    
    IF contractor_record.email IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/send-comment-notification',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key', true) || '"}'::jsonb,
        body := jsonb_build_object(
          'recipient_email', contractor_record.email,
          'recipient_name', contractor_record.contact_name,
          'notification_data', notification_data
        )
      );
    END IF;
  END IF;
  
  -- Notify all admin users
  FOR admin_record IN 
    SELECT pr.name, pr.email 
    FROM public.profiles pr 
    WHERE pr.role = 'admin' AND pr.email IS NOT NULL
  LOOP
    PERFORM net.http_post(
      url := 'https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/send-comment-notification',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key', true) || '"}'::jsonb,
      body := jsonb_build_object(
        'recipient_email', admin_record.email,
        'recipient_name', admin_record.name,
        'notification_data', notification_data
      )
    );
  END LOOP;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing comment notification function to include email notifications
CREATE OR REPLACE FUNCTION public.handle_new_comment() 
RETURNS trigger AS $$
BEGIN
  -- Create in-app notifications (existing functionality)
  PERFORM public.create_comment_notifications(
    NEW.request_id,
    NEW.text,
    NEW.user_name
  );
  
  -- Send email notifications (new functionality)
  PERFORM public.send_comment_email_notification(
    NEW.request_id,
    NEW.text,
    NEW.user_name,
    NEW.user_role
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable the pg_net extension if not already enabled (for HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net;
