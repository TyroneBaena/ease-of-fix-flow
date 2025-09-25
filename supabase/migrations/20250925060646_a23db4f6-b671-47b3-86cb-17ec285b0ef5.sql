-- Drop existing policies for subscribers table
DROP POLICY IF EXISTS insert_own_subscription ON public.subscribers;
DROP POLICY IF EXISTS select_own_subscription ON public.subscribers;
DROP POLICY IF EXISTS update_own_subscription ON public.subscribers;

-- Create new policies that are more reliable
CREATE POLICY "Users can insert their own subscription" 
ON public.subscribers 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() OR 
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Users can select their own subscription" 
ON public.subscribers 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Users can update their own subscription" 
ON public.subscribers 
FOR UPDATE 
USING (
  user_id = auth.uid() OR 
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
) 
WITH CHECK (
  user_id = auth.uid() OR 
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);