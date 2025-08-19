-- Fix infinite recursion in profiles table policies
-- Drop problematic policies that reference profiles table within their own policies
DROP POLICY IF EXISTS "Admin users can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin users can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin users can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create new policies using the existing security definer function to avoid recursion
CREATE POLICY "Admins can view all profiles using function" 
ON public.profiles 
FOR SELECT 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can update all profiles using function" 
ON public.profiles 
FOR UPDATE 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can insert profiles using function" 
ON public.profiles 
FOR INSERT 
WITH CHECK (get_current_user_role() = 'admin' OR auth.uid() = id);

CREATE POLICY "Admins can delete profiles using function" 
ON public.profiles 
FOR DELETE 
USING (get_current_user_role() = 'admin');