-- CRITICAL PERFORMANCE FIX: Add missing indexes for get_current_user_organization_safe()
-- This function is called for EVERY row in EVERY RLS policy check
-- Without these indexes, it does full table scans causing 60+ second timeouts

-- 1. Index on session_organization_id (first query in the function)
CREATE INDEX IF NOT EXISTS idx_profiles_session_org 
ON public.profiles(session_organization_id) 
WHERE session_organization_id IS NOT NULL;

-- 2. Composite index on user_organizations for the fallback query
CREATE INDEX IF NOT EXISTS idx_user_orgs_lookup 
ON public.user_organizations(user_id, is_active, is_default DESC, created_at ASC) 
WHERE is_active = true;

-- 3. Index on profiles(id) should exist (primary key) but ensure it's there
-- This is for the main user lookup in get_current_user_organization_safe()
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

-- 4. Additional performance indexes for common RLS checks
CREATE INDEX IF NOT EXISTS idx_user_orgs_org_active 
ON public.user_organizations(organization_id, is_active) 
WHERE is_active = true;

-- EXPLAIN: These indexes dramatically speed up:
-- - get_current_user_organization_safe() from 3 full table scans to 3 index lookups
-- - Reduces query time from seconds to milliseconds
-- - Fixes the 60+ second timeout issue across Properties, Requests, etc.

COMMENT ON INDEX idx_profiles_session_org IS 'Speeds up session_organization_id lookup in get_current_user_organization_safe()';
COMMENT ON INDEX idx_user_orgs_lookup IS 'Optimizes user organization lookup with is_active filter and ordering';
COMMENT ON INDEX idx_user_orgs_org_active IS 'Speeds up organization membership checks in RLS policies';