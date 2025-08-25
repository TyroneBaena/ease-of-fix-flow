-- Check and fix the comments table trigger issue
-- The problem is likely with the set_user_id trigger conflicting with our function

-- First, let's see if there's a trigger on comments table that might be causing issues
-- Drop any existing trigger that might interfere
DROP TRIGGER IF EXISTS set_user_id_trigger ON public.comments;
DROP TRIGGER IF EXISTS handle_new_comment_trigger ON public.comments;

-- Recreate the handle_new_comment trigger properly
CREATE TRIGGER handle_new_comment_trigger
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_comment();

-- Update the add_new_comment function to be more robust
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
  -- Validate inputs
  IF p_user_id IS NULL OR p_request_id IS NULL OR p_text IS NULL THEN
    RAISE EXCEPTION 'Missing required parameters';
  END IF;
  
  -- Validate and convert UUIDs
  BEGIN
    user_uuid := p_user_id::uuid;
    request_uuid := p_request_id::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid UUID format provided';
  END;
  
  -- Insert the comment with explicit user_id (no default/trigger interference)
  INSERT INTO public.comments (
    user_id,
    request_id,
    text,
    user_name,
    user_role,
    created_at,
    updated_at
  )
  VALUES (
    user_uuid,
    request_uuid,
    p_text,
    p_user_name,
    p_user_role,
    now(),
    now()
  )
  RETURNING id INTO new_comment_id;
  
  RETURN new_comment_id;
END;
$$;