-- Remove the problematic trigger that's causing user_id type issues
DROP TRIGGER IF EXISTS set_user_id_before_insert ON public.comments;