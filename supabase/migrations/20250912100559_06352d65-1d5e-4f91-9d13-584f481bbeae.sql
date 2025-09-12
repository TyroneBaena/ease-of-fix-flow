-- Remove organization_code column from organizations table (Phase 3 revert)
ALTER TABLE public.organizations DROP COLUMN IF EXISTS organization_code;