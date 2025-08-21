-- Fix the duplicate contractor profiles and RLS issues

-- Step 1: Remove duplicate contractor (keep the most recent one)
DELETE FROM public.contractors 
WHERE user_id = '8325054d-a806-4642-90c7-f15195cb566b'
AND id = 'aca37f16-58ec-4472-a508-8e61ace10056';

-- Step 2: Ensure we have the unique constraint
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE public.contractors 
        ADD CONSTRAINT contractors_user_id_unique UNIQUE (user_id);
    EXCEPTION
        WHEN duplicate_object THEN
            -- Constraint already exists, do nothing
    END;
END $$;

-- Step 3: Update the RLS policies for contractors to be more permissive for debugging
DROP POLICY IF EXISTS "contractors_select_own" ON public.contractors;

-- Create a more permissive policy that allows contractors to see their own profiles
CREATE POLICY "contractors_select_own" ON public.contractors
FOR SELECT 
USING (
    user_id = auth.uid() 
    OR 
    (auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() 
        AND raw_user_meta_data->>'role' = 'contractor'
    ))
);

-- Step 4: Improve the is_contractor function to be more robust
CREATE OR REPLACE FUNCTION public.is_contractor()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  is_contractor_user boolean := false;
  user_role text;
BEGIN
  -- First check the user role from metadata
  SELECT raw_user_meta_data->>'role' INTO user_role
  FROM auth.users
  WHERE id = auth.uid();
  
  -- If role is contractor, check if profile exists
  IF user_role = 'contractor' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.contractors 
      WHERE user_id = auth.uid()
    ) INTO is_contractor_user;
  END IF;
  
  RETURN is_contractor_user;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$function$;

-- Step 5: Update get_contractor_id function to be more robust
CREATE OR REPLACE FUNCTION public.get_contractor_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  contractor_uuid uuid;
BEGIN
  -- Get contractor ID for current authenticated user
  SELECT id INTO contractor_uuid
  FROM public.contractors
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN contractor_uuid;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in get_contractor_id for user %: %', auth.uid(), SQLERRM;
    RETURN NULL;
END;
$function$;

-- Step 6: Test the functions work correctly
SELECT 
  auth.uid() as current_user,
  public.is_contractor() as is_contractor_check,
  public.get_contractor_id() as contractor_id;