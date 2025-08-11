-- Secure comments table: restrict read access and safe inserts
-- 1) Ensure RLS is enabled
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 2) Drop overly permissive existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.comments;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.comments;

-- 3) Create stricter SELECT policies
-- Admins can view all comments
CREATE POLICY comments_select_admin
ON public.comments
FOR SELECT
USING (public.get_current_user_role() = 'admin');

-- Managers can view all comments
CREATE POLICY comments_select_manager
ON public.comments
FOR SELECT
USING (public.get_current_user_role() = 'manager');

-- Request owners can view comments on their requests
CREATE POLICY comments_select_request_owner
ON public.comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.maintenance_requests mr
    WHERE mr.id = public.comments.request_id
      AND mr.user_id = auth.uid()
  )
);

-- Assigned contractors can view comments
CREATE POLICY comments_select_contractor
ON public.comments
FOR SELECT
USING (
  public.is_contractor_user() AND EXISTS (
    SELECT 1
    FROM public.maintenance_requests mr
    WHERE mr.id = public.comments.request_id
      AND mr.contractor_id = public.get_contractor_id()
  )
);

-- 4) Create stricter INSERT policy (only participants; user_id must match auth.uid())
CREATE POLICY comments_insert_participants
ON public.comments
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND (
    public.get_current_user_role() = ANY(ARRAY['admin','manager'])
    OR EXISTS (
      SELECT 1 FROM public.maintenance_requests mr
      WHERE mr.id = public.comments.request_id
        AND mr.user_id = auth.uid()
    )
    OR (
      public.is_contractor_user() AND EXISTS (
        SELECT 1 FROM public.maintenance_requests mr
        WHERE mr.id = public.comments.request_id
          AND mr.contractor_id = public.get_contractor_id()
      )
    )
  )
);

-- 5) Enforce user_id server-side via trigger to prevent spoofing
DROP TRIGGER IF EXISTS set_user_id_before_insert ON public.comments;
CREATE TRIGGER set_user_id_before_insert
BEFORE INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.set_user_id();