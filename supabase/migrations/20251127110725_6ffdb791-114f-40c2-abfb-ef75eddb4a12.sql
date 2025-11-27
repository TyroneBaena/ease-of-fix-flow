-- Fix duplicate notifications by tracking notified users
CREATE OR REPLACE FUNCTION public.create_comment_notifications(
  request_id_param uuid,
  comment_text text,
  commenter_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  request_record RECORD;
  request_owner_id uuid;
  contractor_user_id uuid;
  admin_user RECORD;
  manager_user RECORD;
  notified_users uuid[] := '{}';  -- Track already notified users to prevent duplicates
BEGIN
  -- Get request details
  SELECT * INTO request_record
  FROM maintenance_requests
  WHERE id = request_id_param;
  
  IF request_record IS NULL THEN
    RETURN;
  END IF;
  
  -- Notify request owner (user_id) - FIRST PRIORITY
  IF request_record.user_id IS NOT NULL AND NOT (request_record.user_id = ANY(notified_users)) THEN
    INSERT INTO notifications (user_id, title, message, type, link, organization_id)
    VALUES (
      request_record.user_id,
      'New comment on maintenance request',
      format('%s commented: %s', commenter_name, left(comment_text, 100)),
      'info',
      '/requests/' || request_id_param,
      request_record.organization_id
    );
    notified_users := array_append(notified_users, request_record.user_id);
  END IF;
  
  -- Notify assigned contractor (if exists) - SECOND PRIORITY
  IF request_record.contractor_id IS NOT NULL THEN
    SELECT user_id INTO contractor_user_id
    FROM contractors
    WHERE id = request_record.contractor_id;
    
    IF contractor_user_id IS NOT NULL AND NOT (contractor_user_id = ANY(notified_users)) THEN
      INSERT INTO notifications (user_id, title, message, type, link, organization_id)
      VALUES (
        contractor_user_id,
        'New comment on assigned job',
        format('%s commented: %s', commenter_name, left(comment_text, 100)),
        'info',
        '/contractor-jobs?requestId=' || request_id_param,
        request_record.organization_id
      );
      notified_users := array_append(notified_users, contractor_user_id);
    END IF;
  END IF;
  
  -- Notify all admin users in the organization - THIRD PRIORITY
  FOR admin_user IN
    SELECT id FROM profiles
    WHERE role = 'admin'
    AND organization_id = request_record.organization_id
  LOOP
    IF NOT (admin_user.id = ANY(notified_users)) THEN
      INSERT INTO notifications (user_id, title, message, type, link, organization_id)
      VALUES (
        admin_user.id,
        'New comment on maintenance request',
        format('%s commented: %s', commenter_name, left(comment_text, 100)),
        'info',
        '/requests/' || request_id_param,
        request_record.organization_id
      );
      notified_users := array_append(notified_users, admin_user.id);
    END IF;
  END LOOP;
  
  -- Notify managers assigned to this property - FOURTH PRIORITY
  IF request_record.property_id IS NOT NULL THEN
    FOR manager_user IN
      SELECT id FROM profiles
      WHERE role = 'manager'
      AND organization_id = request_record.organization_id
      AND request_record.property_id::text = ANY(assigned_properties)
    LOOP
      IF NOT (manager_user.id = ANY(notified_users)) THEN
        INSERT INTO notifications (user_id, title, message, type, link, organization_id)
        VALUES (
          manager_user.id,
          'New comment on maintenance request',
          format('%s commented: %s', commenter_name, left(comment_text, 100)),
          'info',
          '/requests/' || request_id_param,
          request_record.organization_id
        );
        notified_users := array_append(notified_users, manager_user.id);
      END IF;
    END LOOP;
  END IF;
END;
$function$;