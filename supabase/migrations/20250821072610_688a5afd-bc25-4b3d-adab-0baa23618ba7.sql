-- Fix all duplicate contractors at once

-- Step 1: Remove ALL duplicates except the most recent for each user_id
WITH ranked_contractors AS (
  SELECT id, user_id,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC, created_at DESC) as rn
  FROM public.contractors
)
DELETE FROM public.contractors 
WHERE id IN (
  SELECT id FROM ranked_contractors WHERE rn > 1
);

-- Step 2: Remove the specific duplicate we identified
DELETE FROM public.contractors 
WHERE user_id = '8325054d-a806-4642-90c7-f15195cb566b'
AND id = 'aca37f16-58ec-4472-a508-8e61ace10056';

-- Step 3: Fix RLS policies to be more permissive
DROP POLICY IF EXISTS "contractors_select_own" ON public.contractors;

CREATE POLICY "contractors_select_own" ON public.contractors
FOR SELECT 
USING (user_id = auth.uid());

-- Step 4: Create a simple debug policy for contractors
CREATE POLICY "contractors_debug_access" ON public.contractors
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND (
    user_id = auth.uid() 
    OR 
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'contractor'
  )
);

-- Step 5: Improve the contractor functions
CREATE OR REPLACE FUNCTION public.is_contractor()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.contractors 
    WHERE user_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_contractor_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT id FROM public.contractors WHERE user_id = auth.uid() LIMIT 1;
$function$;