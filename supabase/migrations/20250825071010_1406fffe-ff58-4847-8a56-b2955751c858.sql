-- Completely fix the comments RLS policies by dropping ALL and recreating clean ones
-- Drop ALL existing policies first
DROP POLICY IF EXISTS "comments_insert_participants" ON public.comments;
DROP POLICY IF EXISTS "comments_select_admin" ON public.comments;
DROP POLICY IF EXISTS "comments_select_contractor" ON public.comments;
DROP POLICY IF EXISTS "comments_select_manager" ON public.comments;
DROP POLICY IF EXISTS "comments_select_request_owner" ON public.comments;

-- Create simple, working policies
CREATE POLICY "allow_authenticated_select_comments" 
ON public.comments 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "allow_authenticated_insert_comments" 
ON public.comments 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());