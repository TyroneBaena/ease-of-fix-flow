
-- Create a function to insert comments with proper UUID handling
CREATE OR REPLACE FUNCTION public.insert_comment(
  p_user_id uuid,
  p_request_id uuid,
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
    p_user_id,
    p_request_id,
    p_text,
    p_user_name,
    p_user_role
  )
  RETURNING id INTO new_comment_id;
  
  RETURN new_comment_id;
END;
$$;
