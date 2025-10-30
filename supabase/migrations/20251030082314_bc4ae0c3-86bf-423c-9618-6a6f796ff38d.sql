-- Fix for UUID mismatch between auth.users and profiles table
-- This migration cleans up profiles that don't match their auth.users UUID

-- Step 1: Identify and log profiles with UUID mismatches
DO $$
DECLARE
  mismatched_profile RECORD;
BEGIN
  FOR mismatched_profile IN 
    SELECT p.id as profile_id, p.email, au.id as auth_id
    FROM public.profiles p
    LEFT JOIN auth.users au ON p.email = au.email
    WHERE p.id != au.id
  LOOP
    RAISE NOTICE 'Found UUID mismatch: Profile ID=%, Auth ID=%, Email=%', 
      mismatched_profile.profile_id, 
      mismatched_profile.auth_id,
      mismatched_profile.email;
  END LOOP;
END $$;

-- Step 2: Delete profiles that have UUID mismatch and no organization
-- These are broken profiles that need to be recreated
DELETE FROM public.profiles
WHERE id IN (
  SELECT p.id
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.email = au.email
  WHERE p.id != au.id
  AND p.organization_id IS NULL
);

-- Step 3: Ensure the trigger to create profiles on signup is working properly
-- Recreate the trigger function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user_profile_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only create profile if it doesn't already exist
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    INSERT INTO public.profiles (id, name, email, role)
    VALUES (
      NEW.id,  -- Use the auth.users ID directly
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      NEW.email,
      'manager'  -- Default role, will be set to admin when they create organization
    );
    
    RAISE LOG 'Created profile for user: %, ID: %', NEW.email, NEW.id;
  ELSE
    RAISE LOG 'Profile already exists for user: %, ID: %', NEW.email, NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block signup
    RAISE LOG 'Error creating profile for user %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$function$;