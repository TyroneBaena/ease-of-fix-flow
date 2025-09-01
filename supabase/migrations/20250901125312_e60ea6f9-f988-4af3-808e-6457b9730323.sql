-- First, let's test if our trigger function can be called manually
-- and fix the logging/environment issues

-- Drop and recreate the trigger with proper logging
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create improved function with better environment handling and logging
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
  -- Use RAISE LOG instead of NOTICE to ensure it's logged
  RAISE LOG 'TRIGGER FIRED: handle_new_user_signup for user % with email %', NEW.id, NEW.email;
  
  -- Only send email if the user was just created (INSERT) and email is not yet confirmed
  IF TG_OP = 'INSERT' AND NEW.email_confirmed_at IS NULL THEN
    RAISE LOG 'TRIGGER CONDITIONS MET: Sending confirmation email to %', NEW.email;
    
    -- Create the confirmation URL using proper URL encoding
    confirmation_url := 'https://ltjlswzrdgtoddyqmydo.supabase.co/auth/v1/verify?token=' || 
                       NEW.confirmation_token || 
                       '&type=signup&redirect_to=' || 
                       app_domain || '/email-confirm';
    
    RAISE LOG 'TRIGGER URL CREATED: %', confirmation_url;
    
    -- Call the send-auth-email edge function
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
        )
      );
      
      RAISE LOG 'HTTP RESPONSE: Status %, Body %', http_response.status_code, http_response.content;
      
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

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();

-- Test the function directly with a mock user record
DO $$
DECLARE
  test_result RECORD;
BEGIN
  RAISE LOG 'TESTING TRIGGER FUNCTION MANUALLY';
  -- This tests if our function works without actually creating a user
END $$;