-- Create a simple test function to check if logging works
CREATE OR REPLACE FUNCTION public.test_logging()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    RAISE NOTICE 'TEST FUNCTION CALLED - LOGGING WORKS!';
END;
$function$;

-- Call the test function immediately
SELECT public.test_logging();