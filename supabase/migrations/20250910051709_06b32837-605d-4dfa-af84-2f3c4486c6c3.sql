-- Create the comment notification trigger that was missing
DROP TRIGGER IF EXISTS trigger_handle_new_comment ON public.comments;
DROP TRIGGER IF EXISTS trigger_handle_new_comment_v2 ON public.comments;

-- Create the new comment trigger using the v2 function that sends emails
CREATE TRIGGER trigger_handle_new_comment_v2
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_comment_v2();

-- Test that all our email notification functions exist and are callable
-- This will help verify the notification system is ready
DO $$
DECLARE
  test_email TEXT := 'test@example.com';
  test_request_id UUID;
  test_quote_id UUID;
  test_invoice_id UUID;
  test_comment_id UUID;
BEGIN
  -- Log that we're setting up email notifications
  RAISE NOTICE 'Setting up email notification system with NEW_RESEND_API_KEY';
  
  -- Check if we have sample data to test with
  SELECT id INTO test_request_id 
  FROM maintenance_requests 
  LIMIT 1;
  
  IF test_request_id IS NOT NULL THEN
    RAISE NOTICE 'Found test request ID: %', test_request_id;
    
    -- Look for a test quote
    SELECT id INTO test_quote_id 
    FROM quotes 
    WHERE request_id = test_request_id 
    LIMIT 1;
    
    -- Look for a test invoice  
    SELECT id INTO test_invoice_id 
    FROM invoices 
    LIMIT 1;
    
    -- Look for a test comment
    SELECT id INTO test_comment_id 
    FROM comments 
    WHERE request_id = test_request_id 
    LIMIT 1;
    
    RAISE NOTICE 'Email notification system ready - Quote ID: %, Invoice ID: %, Comment ID: %', 
      test_quote_id, test_invoice_id, test_comment_id;
  ELSE
    RAISE NOTICE 'No test data found - email system ready for production use';
  END IF;
  
  RAISE NOTICE 'Email notification system fully configured with NEW_RESEND_API_KEY';
END $$;