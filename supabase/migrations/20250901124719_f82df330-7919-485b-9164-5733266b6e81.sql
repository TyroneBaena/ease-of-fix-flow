-- Fix the database trigger to resolve URL and field mapping issues
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  confirmation_url TEXT;
  service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0amxzd3pyZGd0b2RkeXFteWRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDU0MDk5MiwiZXhwIjoyMDYwMTE2OTkyfQ.BLQ5g9hPWdNcWfSBALa5wE2_5qVdYJV7sQjfmUgV0t4';
  http_response RECORD;
  app_domain TEXT := 'https://ltjlswzrdgtoddyqmydo.supabase.co';
BEGIN
  -- Only send email if the user was just created (INSERT) and email is not yet confirmed
  IF TG_OP = 'INSERT' AND NEW.email_confirmed_at IS NULL THEN
    -- Create the confirmation URL using the confirmation token with proper URL encoding
    confirmation_url := 'https://ltjlswzrdgtoddyqmydo.supabase.co/auth/v1/verify?token=' || 
                       NEW.confirmation_token || 
                       '&type=signup&redirect_to=' || 
                       encode(app_domain || '/email-confirm', 'escape');
    
    RAISE NOTICE 'Sending confirmation email to: % with URL: %', NEW.email, confirmation_url;
    
    -- Call the send-auth-email edge function with corrected field mapping
    SELECT * INTO http_response FROM net.http_post(
      url := 'https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/send-auth-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'users',
        'record', jsonb_build_object(
          'id', NEW.id,
          'email', NEW.email,
          'email_confirm_token', NEW.confirmation_token,
          'created_at', NEW.created_at,
          'confirmation_url', confirmation_url
        )
      )
    );
    
    RAISE NOTICE 'Email function response - Status: %, Body: %', http_response.status_code, http_response.content;
    
    -- Log successful trigger execution
    IF http_response.status_code = 200 THEN
      RAISE NOTICE 'Email trigger executed successfully for user: %', NEW.email;
    ELSE
      RAISE WARNING 'Email trigger failed with status: % for user: %', http_response.status_code, NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't block user creation if email sending fails
    RAISE LOG 'Error sending confirmation email for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;