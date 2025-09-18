-- Create the analytics_query function for security metrics
CREATE OR REPLACE FUNCTION public.analytics_query(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Execute the provided SQL query and return results as JSON
    EXECUTE format('SELECT json_agg(row_to_json(t)) FROM (%s) t', query) INTO result;
    RETURN COALESCE(result, '[]'::json);
END;
$$;