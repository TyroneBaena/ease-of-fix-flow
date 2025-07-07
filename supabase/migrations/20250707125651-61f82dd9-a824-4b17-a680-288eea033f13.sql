
-- Drop the comments table and recreate it with proper column types
DROP TABLE IF EXISTS public.comments CASCADE;

-- Create the comments table with correct UUID column types
CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  request_id uuid NOT NULL,
  text text NOT NULL,
  user_name text NOT NULL,
  user_role text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add foreign key constraint to maintenance_requests
ALTER TABLE public.comments 
ADD CONSTRAINT comments_request_id_fkey 
FOREIGN KEY (request_id) REFERENCES public.maintenance_requests(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for comments table
CREATE POLICY "comments_select_policy" ON public.comments
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "comments_insert_policy" ON public.comments
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_update_policy" ON public.comments
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_delete_policy" ON public.comments
FOR DELETE TO authenticated
USING (true);

-- Create trigger for comment notifications (if the function exists)
CREATE OR REPLACE TRIGGER handle_new_comment_trigger
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_comment();
