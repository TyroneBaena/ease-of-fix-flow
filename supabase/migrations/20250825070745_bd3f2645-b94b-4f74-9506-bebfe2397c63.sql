-- Fix the problematic RLS policies that are causing the type mismatch
-- The issue is likely in how the RLS policies are comparing user_id values

-- First, let's drop and recreate the problematic comment selection policies
DROP POLICY IF EXISTS "comments_select_contractor" ON public.comments;
DROP POLICY IF EXISTS "comments_select_request_owner" ON public.comments;
DROP POLICY IF EXISTS "comments_insert_participants" ON public.comments;

-- Recreate them with proper type handling
CREATE POLICY "comments_select_contractor" 
ON public.comments 
FOR SELECT 
USING (
  is_contractor_user() 
  AND EXISTS (
    SELECT 1 FROM maintenance_requests mr
    WHERE mr.id = comments.request_id 
    AND mr.contractor_id = get_contractor_id()
  )
);

CREATE POLICY "comments_select_request_owner" 
ON public.comments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM maintenance_requests mr
    WHERE mr.id = comments.request_id 
    AND mr.user_id = auth.uid()
  )
);

CREATE POLICY "comments_insert_participants" 
ON public.comments 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid()
  AND (
    get_current_user_role() = ANY (ARRAY['admin'::text, 'manager'::text])
    OR EXISTS (
      SELECT 1 FROM maintenance_requests mr
      WHERE mr.id = comments.request_id 
      AND mr.user_id = auth.uid()
    )
    OR (
      is_contractor_user() 
      AND EXISTS (
        SELECT 1 FROM maintenance_requests mr
        WHERE mr.id = comments.request_id 
        AND mr.contractor_id = get_contractor_id()
      )
    )
  )
);