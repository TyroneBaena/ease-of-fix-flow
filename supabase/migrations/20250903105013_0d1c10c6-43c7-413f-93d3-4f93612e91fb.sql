-- Fix critical bugs step by step to avoid foreign key conflicts

-- Step 1: Fix missing session_organization_id for all users
UPDATE public.profiles 
SET session_organization_id = organization_id 
WHERE session_organization_id IS NULL AND organization_id IS NOT NULL;

-- Step 2: Update maintenance requests to remove contractor assignments for non-contractor users
UPDATE public.maintenance_requests 
SET contractor_id = NULL, status = 'pending'
WHERE contractor_id IN (
  SELECT c.id 
  FROM public.contractors c
  JOIN public.profiles p ON c.user_id = p.id
  WHERE p.role != 'contractor'
);

-- Step 3: Now safely clean up role-contractor mismatches
DELETE FROM public.contractors 
WHERE user_id IN (
  SELECT p.id 
  FROM public.profiles p 
  WHERE p.role != 'contractor'
);

-- Step 4: Fix RLS policy conflicts - Remove duplicate policies on profiles table
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;  
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;