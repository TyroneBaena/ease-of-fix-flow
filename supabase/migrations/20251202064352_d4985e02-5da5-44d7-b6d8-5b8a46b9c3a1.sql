-- Phase 3: Add must_change_password column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.must_change_password IS 'Flag indicating user must change their password on next login (e.g., after invitation with temp password)';