
-- Drop the existing function completely and create a new one with a different name
DROP FUNCTION IF EXISTS public.insert_comment(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.insert_comment(uuid, uuid, text, text, text);

-- Create a new function with a different name to avoid caching issues
CREATE OR REPLACE FUNCTION public.add_new_comment(
  p_user_id text,
  p_request_id text, 
  p_text text,
  p_user_name text,
  p_user_role text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_comment_id uuid;
  user_uuid uuid;
  request_uuid uuid;
BEGIN
  -- Validate and convert UUIDs
  BEGIN
    user_uuid := p_user_id::uuid;
    request_uuid := p_request_id::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid UUID format provided';
  END;
  
  -- Insert the comment
  INSERT INTO public.comments (
    user_id,
    request_id,
    text,
    user_name,
    user_role
  )
  VALUES (
    user_uuid,
    request_uuid,
    p_text,
    p_user_name,
    p_user_role
  )
  RETURNING id INTO new_comment_id;
  
  RETURN new_comment_id;
END;
$$;
