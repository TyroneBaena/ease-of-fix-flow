-- Drop duplicate comment notification triggers
-- Keep only trigger_handle_new_comment_v2 which is the latest version with email support

DROP TRIGGER IF EXISTS comments_new_comment_trigger ON public.comments;
DROP TRIGGER IF EXISTS handle_new_comment_trigger ON public.comments;
DROP TRIGGER IF EXISTS handle_new_comment_v2 ON public.comments;

-- The trigger_handle_new_comment_v2 remains active and will be the only trigger firing

-- Optional: Clean up duplicate notifications created in the last hour
-- This removes duplicate notifications that were created at the exact same timestamp
DELETE FROM public.notifications
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, title, message, created_at 
        ORDER BY id
      ) as rn
    FROM public.notifications
    WHERE created_at > NOW() - INTERVAL '1 hour'
  ) t
  WHERE t.rn > 1
);