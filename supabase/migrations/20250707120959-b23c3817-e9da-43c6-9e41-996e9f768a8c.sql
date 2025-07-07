
-- Drop and recreate the insert_comment function with proper UUID parameter handling
DROP FUNCTION IF EXISTS public.insert_comment(uuid, uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.insert_comment(
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
BEGIN
  INSERT INTO public.comments (
    user_id,
    request_id,
    text,
    user_name,
    user_role
  )
  VALUES (
    p_user_id::uuid,
    p_request_id::uuid,
    p_text,
    p_user_name,
    p_user_role
  )
  RETURNING id INTO new_comment_id;
  
  RETURN new_comment_id;
END;
$$;
