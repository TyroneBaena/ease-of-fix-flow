-- Allow managers to view other managers for Practice Leader selection
CREATE POLICY "Managers can view other managers" 
ON public.profiles 
FOR SELECT 
USING (get_current_user_role() = 'manager' AND role = 'manager');