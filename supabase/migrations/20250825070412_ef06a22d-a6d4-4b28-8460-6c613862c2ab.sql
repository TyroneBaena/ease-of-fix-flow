-- Fix the user_id column default to prevent type conflicts
-- Remove the problematic default value that's causing the type mismatch
ALTER TABLE public.comments ALTER COLUMN user_id DROP DEFAULT;

-- Ensure user_id is properly set as NOT NULL without the problematic default
ALTER TABLE public.comments ALTER COLUMN user_id SET NOT NULL;