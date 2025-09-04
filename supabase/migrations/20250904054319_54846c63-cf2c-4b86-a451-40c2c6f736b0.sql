-- Create a function to handle comment email notifications via database trigger
CREATE OR REPLACE FUNCTION public.send_comment_email_notifications_v2(comment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  comment_record RECORD;
  request_record RECORD;
  notification_data JSONB;
  service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0amxzd3pyZGd0b2RkeXFteWRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDU0MDk5MiwiZXhwIjoyMDYwMTE2OTkyfQ.BLQ5g9hPWdNcWfSBALa5wE2_5qVdYJV7sQjfmUgV0t4';
  http_response RECORD;
  user_record RECORD;
BEGIN
  RAISE NOTICE 'Starting email notification process for comment: %', comment_id;
  
  -- Get comment details
  SELECT c.*, mr.organization_id as request_organization_id
  INTO comment_record 
  FROM public.comments c
  JOIN public.maintenance_requests mr ON c.request_id = mr.id
  WHERE c.id = comment_id;
  
  IF comment_record IS NULL THEN
    RAISE NOTICE 'Comment not found: %', comment_id;
    RETURN;
  END IF;
  
  -- Get request details with property info
  SELECT mr.*, 
         COALESCE(p.name, '') as property_name, 
         COALESCE(p.address, '') as property_address
  INTO request_record 
  FROM public.maintenance_requests mr
  LEFT JOIN public.properties p ON mr.property_id = p.id
  WHERE mr.id = comment_record.request_id;
  
  IF request_record IS NULL THEN
    RAISE NOTICE 'Request not found: %', comment_record.request_id;
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found request: % with organization: %', request_record.title, request_record.organization_id;
  
  -- Prepare notification data
  notification_data := jsonb_build_object(
    'request_id', comment_record.request_id,
    'request_title', COALESCE(request_record.title, ''),
    'request_description', COALESCE(request_record.description, ''),
    'request_location', COALESCE(request_record.location, ''),
    'request_priority', COALESCE(request_record.priority, ''),
    'request_status', COALESCE(request_record.status, ''),
    'property_name', COALESCE(request_record.property_name, ''),
    'property_address', COALESCE(request_record.property_address, ''),
    'comment_text', COALESCE(comment_record.text, ''),
    'commenter_name', COALESCE(comment_record.user_name, ''),
    'commenter_role', COALESCE(comment_record.user_role, ''),
    'comment_date', comment_record.created_at,
    'direct_link', 'https://ltjlswzrdgtoddyqmydo.supabase.co/requests/' || comment_record.request_id
  );
  
  -- Send email to request owner (if from same organization)
  IF request_record.user_id IS NOT NULL THEN
    SELECT COALESCE(pr.name, '') as name, pr.email, pr.organization_id
    INTO user_record
    FROM public.profiles pr
    WHERE pr.id = request_record.user_id
    AND pr.organization_id = request_record.organization_id;
    
    IF user_record.email IS NOT NULL THEN
      RAISE NOTICE 'Sending email to request owner: %', user_record.email;
      
      SELECT * INTO http_response FROM net.http_post(
        url := 'https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/send-comment-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'recipient_email', user_record.email,
          'recipient_name', COALESCE(user_record.name, ''),
          'notification_data', notification_data
        )
      );
      
      RAISE NOTICE 'Email response for owner - Status: %, Body: %', http_response.status_code, http_response.content;
    END IF;
  END IF;
  
  -- Send email to assigned contractor (if from same organization)
  IF request_record.contractor_id IS NOT NULL THEN
    SELECT COALESCE(c.contact_name, '') as contact_name, c.email, c.organization_id
    INTO user_record
    FROM public.contractors c
    WHERE c.id = request_record.contractor_id
    AND c.organization_id = request_record.organization_id;
    
    IF user_record.email IS NOT NULL THEN
      RAISE NOTICE 'Sending email to contractor: %', user_record.email;
      
      SELECT * INTO http_response FROM net.http_post(
        url := 'https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/send-comment-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'recipient_email', user_record.email,
          'recipient_name', COALESCE(user_record.contact_name, ''),
          'notification_data', notification_data
        )
      );
      
      RAISE NOTICE 'Email response for contractor - Status: %, Body: %', http_response.status_code, http_response.content;
    END IF;
  END IF;
  
  -- Send email to organization admins only
  FOR user_record IN 
    SELECT COALESCE(pr.name, '') as name, pr.email 
    FROM public.profiles pr 
    WHERE pr.role = 'admin' 
    AND pr.email IS NOT NULL
    AND pr.organization_id = request_record.organization_id
  LOOP
    RAISE NOTICE 'Sending email to admin: %', user_record.email;
    
    SELECT * INTO http_response FROM net.http_post(
      url := 'https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/send-comment-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'recipient_email', user_record.email,
        'recipient_name', COALESCE(user_record.name, ''),
        'notification_data', notification_data
      )
    );
    
    RAISE NOTICE 'Email response for admin - Status: %, Body: %', http_response.status_code, http_response.content;
  END LOOP;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in send_comment_email_notifications_v2: %', SQLERRM;
END;
$$;

-- Create trigger to automatically send comment email notifications
CREATE OR REPLACE FUNCTION public.handle_new_comment_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create in-app notifications (keep existing functionality)
  PERFORM public.create_comment_notifications(
    NEW.request_id,
    NEW.text,
    NEW.user_name
  );
  
  -- Send email notifications asynchronously (new functionality)
  PERFORM public.send_comment_email_notifications_v2(NEW.id);
  
  RETURN NEW;
END;
$$;

-- Drop the old trigger and create the new one
DROP TRIGGER IF EXISTS handle_new_comment ON public.comments;
CREATE TRIGGER handle_new_comment_v2
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_comment_v2();