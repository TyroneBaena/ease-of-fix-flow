-- Fix the email notification function with embedded service role key
CREATE OR REPLACE FUNCTION public.send_comment_email_notification(p_request_id uuid, p_comment_text text, p_commenter_name text, p_commenter_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  request_record RECORD;
  request_owner_record RECORD;
  contractor_record RECORD;
  admin_record RECORD;
  notification_data JSONB;
  service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0amxzd3pyZGd0b2RkeXFteWRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDU0MDk5MiwiZXhwIjoyMDYwMTE2OTkyfQ.BLQ5g9hPWdNcWfSBALa5wE2_5qVdYJV7sQjfmUgV0t4';
  http_response RECORD;
BEGIN
  RAISE NOTICE 'Starting email notification process for request: %', p_request_id;
  
  -- Get request details
  SELECT mr.*, 
         COALESCE(p.name, '') as property_name, 
         COALESCE(p.address, '') as property_address
  INTO request_record 
  FROM public.maintenance_requests mr
  LEFT JOIN public.properties p ON mr.property_id = p.id
  WHERE mr.id = p_request_id;
  
  IF request_record IS NULL THEN
    RAISE NOTICE 'Request not found: %', p_request_id;
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found request: % with contractor_id: %', request_record.title, request_record.contractor_id;
  
  -- Prepare notification data with proper null handling
  notification_data := jsonb_build_object(
    'request_id', p_request_id,
    'request_title', COALESCE(request_record.title, ''),
    'request_description', COALESCE(request_record.description, ''),
    'request_location', COALESCE(request_record.location, ''),
    'request_priority', COALESCE(request_record.priority, ''),
    'request_status', COALESCE(request_record.status, ''),
    'property_name', COALESCE(request_record.property_name, ''),
    'property_address', COALESCE(request_record.property_address, ''),
    'comment_text', COALESCE(p_comment_text, ''),
    'commenter_name', COALESCE(p_commenter_name, ''),
    'commenter_role', COALESCE(p_commenter_role, ''),
    'comment_date', now(),
    'direct_link', 'https://ltjlswzrdgtoddyqmydo.supabase.co/requests/' || p_request_id
  );
  
  -- Get request owner details and send notification
  IF request_record.user_id IS NOT NULL THEN
    SELECT COALESCE(pr.name, '') as name, pr.email 
    INTO request_owner_record
    FROM public.profiles pr
    WHERE pr.id = request_record.user_id;
    
    IF request_owner_record.email IS NOT NULL THEN
      RAISE NOTICE 'Sending email to request owner: %', request_owner_record.email;
      
      SELECT * INTO http_response FROM net.http_post(
        url := 'https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/send-comment-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'recipient_email', request_owner_record.email,
          'recipient_name', COALESCE(request_owner_record.name, ''),
          'notification_data', notification_data
        )
      );
      
      RAISE NOTICE 'Email response for owner - Status: %, Body: %', http_response.status_code, http_response.content;
    END IF;
  END IF;
  
  -- Notify assigned contractor if exists
  IF request_record.contractor_id IS NOT NULL THEN
    SELECT COALESCE(c.contact_name, '') as contact_name, c.email 
    INTO contractor_record
    FROM public.contractors c
    WHERE c.id = request_record.contractor_id;
    
    IF contractor_record.email IS NOT NULL THEN
      RAISE NOTICE 'Sending email to contractor: %', contractor_record.email;
      
      SELECT * INTO http_response FROM net.http_post(
        url := 'https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/send-comment-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'recipient_email', contractor_record.email,
          'recipient_name', COALESCE(contractor_record.contact_name, ''),
          'notification_data', notification_data
        )
      );
      
      RAISE NOTICE 'Email response for contractor - Status: %, Body: %', http_response.status_code, http_response.content;
    END IF;
  END IF;
  
  -- Notify all admin users
  FOR admin_record IN 
    SELECT COALESCE(pr.name, '') as name, pr.email 
    FROM public.profiles pr 
    WHERE pr.role = 'admin' AND pr.email IS NOT NULL
  LOOP
    RAISE NOTICE 'Sending email to admin: %', admin_record.email;
    
    SELECT * INTO http_response FROM net.http_post(
      url := 'https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/send-comment-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'recipient_email', admin_record.email,
        'recipient_name', COALESCE(admin_record.name, ''),
        'notification_data', notification_data
      )
    );
    
    RAISE NOTICE 'Email response for admin - Status: %, Body: %', http_response.status_code, http_response.content;
  END LOOP;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in send_comment_email_notification: %', SQLERRM;
END;
$function$;