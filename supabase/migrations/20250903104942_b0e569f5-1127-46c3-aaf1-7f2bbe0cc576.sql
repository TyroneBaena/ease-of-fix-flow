-- Fix Bug 1: Update invite function to allow multi-organization membership
-- Fix Bug 2: Set missing session_organization_id for all users
-- Fix Bug 3: Clean up role-contractor mismatches
-- Fix Bug 4: Fix RLS policy conflicts

-- Step 1: Fix missing session_organization_id for all users
UPDATE public.profiles 
SET session_organization_id = organization_id 
WHERE session_organization_id IS NULL AND organization_id IS NOT NULL;

-- Step 2: Clean up role-contractor mismatches (remove contractor records for non-contractor roles)
DELETE FROM public.contractors 
WHERE user_id IN (
  SELECT p.id 
  FROM public.profiles p 
  WHERE p.role != 'contractor'
);

-- Step 3: Fix RLS policy conflicts - Remove duplicate policies on profiles table
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;  
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;