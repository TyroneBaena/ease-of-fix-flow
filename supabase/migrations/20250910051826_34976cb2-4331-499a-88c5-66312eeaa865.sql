-- Recreate the comment notification trigger properly
CREATE OR REPLACE TRIGGER trigger_handle_new_comment_v2
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_comment_v2();

-- Verify trigger creation
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_handle_new_comment_v2';