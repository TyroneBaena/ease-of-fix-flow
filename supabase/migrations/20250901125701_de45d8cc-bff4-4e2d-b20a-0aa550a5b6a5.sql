-- Fix the HTTP response field access in the trigger function
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
  RAISE LOG 'TRIGGER FIRED: handle_new_user_signup for user % with email %', NEW.id, NEW.email;
  
  IF TG_OP = 'INSERT' AND NEW.email_confirmed_at IS NULL THEN
    RAISE LOG 'TRIGGER CONDITIONS MET: Sending confirmation email to %', NEW.email;
    
    confirmation_url := 'https://ltjlswzrdgtoddyqmydo.supabase.co/auth/v1/verify?token=' || 
                       NEW.confirmation_token || 
                       '&type=signup&redirect_to=' || 
                       app_domain || '/email-confirm';
    
    RAISE LOG 'TRIGGER URL CREATED: %', confirmation_url;
    
    BEGIN
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
        ),
        timeout_milliseconds := 3000
      );
      
      -- Fix: Use correct field names for net.http_post response
      RAISE LOG 'HTTP RESPONSE: Status %, Body %', http_response.status, http_response.content;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'HTTP POST ERROR: %', SQLERRM;
    END;
    
  ELSE
    RAISE LOG 'TRIGGER CONDITIONS NOT MET: TG_OP=%, email_confirmed_at=%', TG_OP, NEW.email_confirmed_at;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'TRIGGER EXCEPTION: %', SQLERRM;
    RETURN NEW;
END;
$$;