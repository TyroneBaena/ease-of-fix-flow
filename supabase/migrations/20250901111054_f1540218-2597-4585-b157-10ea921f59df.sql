-- Fix foreign key constraint issue in organizations table
-- The created_by field should reference auth.users.id directly, not profiles.id
-- This prevents the constraint violation during user signup

-- Drop the existing foreign key constraint
ALTER TABLE public.organizations 
DROP CONSTRAINT IF EXISTS organizations_created_by_fkey;

-- Add the correct foreign key constraint to auth.users
ALTER TABLE public.organizations 
ADD CONSTRAINT organizations_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;