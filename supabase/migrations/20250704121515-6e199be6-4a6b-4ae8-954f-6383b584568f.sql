
-- First, let's clean up the overlapping RLS policies on the comments table
-- and create a simpler, more comprehensive policy structure

-- Drop all existing policies on comments table
DROP POLICY IF EXISTS "Admins can view all comments" ON public.comments;
DROP POLICY IF EXISTS "Contractors can view comments on their requests" ON public.comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can insert their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can view comments on requests" ON public.comments;
DROP POLICY IF EXISTS "Users can view comments on their requests" ON public.comments;
DROP POLICY IF EXISTS "comments_insert_own" ON public.comments;
DROP POLICY IF EXISTS "comments_select_all" ON public.comments;
DROP POLICY IF EXISTS "comments_update_own" ON public.comments;

-- Create simplified and comprehensive RLS policies for comments

-- Policy for SELECT (viewing comments)
CREATE POLICY "comments_select_policy" ON public.comments
FOR SELECT TO authenticated
USING (
  -- Admins can see all comments
  (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'))
  OR
  -- Users can see comments on requests they created
  (EXISTS (SELECT 1 FROM maintenance_requests WHERE id = comments.request_id AND user_id = auth.uid()))
  OR
  -- Contractors can see comments on requests assigned to them
  (EXISTS (
    SELECT 1 FROM maintenance_requests mr 
    JOIN contractors c ON mr.contractor_id = c.id 
    WHERE mr.id = comments.request_id AND c.user_id = auth.uid()
  ))
  OR
  -- Users can see their own comments
  (user_id = auth.uid())
);

-- Policy for INSERT (creating comments)
CREATE POLICY "comments_insert_policy" ON public.comments
FOR INSERT TO authenticated
WITH CHECK (
  -- User must be authenticated and inserting their own comment
  auth.uid() = user_id
  AND
  -- User must have access to the request (either created it, is assigned as contractor, or is admin)
  (
    -- Admins can comment on any request
    (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'))
    OR
    -- Users can comment on requests they created
    (EXISTS (SELECT 1 FROM maintenance_requests WHERE id = request_id AND user_id = auth.uid()))
    OR
    -- Contractors can comment on requests assigned to them
    (EXISTS (
      SELECT 1 FROM maintenance_requests mr 
      JOIN contractors c ON mr.contractor_id = c.id 
      WHERE mr.id = request_id AND c.user_id = auth.uid()
    ))
  )
);

-- Policy for UPDATE (editing comments)
CREATE POLICY "comments_update_policy" ON public.comments
FOR UPDATE TO authenticated
USING (
  -- Users can only update their own comments
  user_id = auth.uid()
  OR
  -- Admins can update any comment
  (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'))
)
WITH CHECK (
  -- Ensure user_id doesn't change during update
  user_id = auth.uid()
  OR
  (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'))
);

-- Add a policy for DELETE (optional, for completeness)
CREATE POLICY "comments_delete_policy" ON public.comments
FOR DELETE TO authenticated
USING (
  -- Users can delete their own comments
  user_id = auth.uid()
  OR
  -- Admins can delete any comment
  (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'))
);
