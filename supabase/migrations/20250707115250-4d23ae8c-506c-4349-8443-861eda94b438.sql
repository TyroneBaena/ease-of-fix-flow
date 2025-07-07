
-- Create comprehensive RLS policies for comments table
-- Policy for SELECT (viewing comments)
CREATE POLICY "comments_select_policy" ON public.comments
FOR SELECT TO authenticated
USING (true);

-- Policy for INSERT (creating comments)
CREATE POLICY "comments_insert_policy" ON public.comments
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE (editing comments)
CREATE POLICY "comments_update_policy" ON public.comments
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (auth.uid() = user_id);

-- Policy for DELETE (removing comments)
CREATE POLICY "comments_delete_policy" ON public.comments
FOR DELETE TO authenticated
USING (true);
