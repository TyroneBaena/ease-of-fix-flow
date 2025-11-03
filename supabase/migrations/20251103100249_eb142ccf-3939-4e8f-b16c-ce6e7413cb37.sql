-- CRITICAL FIX: Optimize profiles RLS policy evaluation order
-- When a user queries their own profile, we should NOT evaluate expensive org-level policies

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view only their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins and managers can view organization profiles" ON profiles;

-- Recreate with optimized order:
-- Policy 1: Users can ALWAYS view their own profile (simple, fast check)
CREATE POLICY "Users can view only their own profile" 
ON profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy 2: Admins/managers can view OTHER profiles in same org
-- CRITICAL: Add "id != auth.uid()" to prevent calling expensive function for own profile
CREATE POLICY "Admins and managers can view organization profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  id != auth.uid() AND 
  can_view_organization_profiles(auth.uid(), organization_id)
);

-- This way, when user queries own profile:
-- - First policy matches immediately (no function calls)
-- - Second policy short-circuits without calling expensive function
-- Result: Own profile queries are instant, org-wide queries still work