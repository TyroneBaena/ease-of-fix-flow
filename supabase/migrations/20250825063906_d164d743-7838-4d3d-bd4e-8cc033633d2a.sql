-- Create trigger for comments table to call handle_new_comment function
CREATE TRIGGER comments_new_comment_trigger
    AFTER INSERT ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_comment();