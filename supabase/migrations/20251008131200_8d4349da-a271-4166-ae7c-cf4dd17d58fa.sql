-- ================================================================
-- PHASE 1-3 CRITICAL SECURITY FIXES
-- ================================================================
-- This migration fixes:
-- 1. Cross-organization property assignments (21 violations)
-- 2. Cross-organization user assignments (1 violation)
-- 3. Orphaned profiles without organizations (5 users)
-- 4. Duplicate cron jobs (cleanup)
-- ================================================================

-- ================================================================
-- PART 1: AUDIT AND BACKUP EXISTING VIOLATIONS
-- ================================================================

-- Create audit table for cross-org property assignments
CREATE TABLE IF NOT EXISTS public.cross_org_property_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  property_id UUID NOT NULL,
  request_org_id UUID,
  property_org_id UUID,
  cleaned_at TIMESTAMPTZ DEFAULT NOW(),
  cleaned_by TEXT DEFAULT 'system_migration'
);

-- Backup existing violations before fixing
INSERT INTO public.cross_org_property_audit (request_id, property_id, request_org_id, property_org_id)
SELECT 
  mr.id as request_id,
  mr.property_id,
  mr.organization_id as request_org_id,
  p.organization_id as property_org_id
FROM maintenance_requests mr
JOIN properties p ON mr.property_id = p.id
WHERE mr.property_id IS NOT NULL 
  AND mr.organization_id != p.organization_id;

-- Create audit table for cross-org user assignments
CREATE TABLE IF NOT EXISTS public.cross_org_user_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  user_id UUID NOT NULL,
  request_org_id UUID,
  user_org_id UUID,
  cleaned_at TIMESTAMPTZ DEFAULT NOW(),
  cleaned_by TEXT DEFAULT 'system_migration'
);

-- Backup cross-org user assignments
INSERT INTO public.cross_org_user_audit (request_id, user_id, request_org_id, user_org_id)
SELECT 
  mr.id as request_id,
  mr.user_id,
  mr.organization_id as request_org_id,
  p.organization_id as user_org_id
FROM maintenance_requests mr
JOIN profiles p ON mr.user_id = p.id
WHERE mr.user_id IS NOT NULL
  AND mr.organization_id != p.organization_id;

-- ================================================================
-- PART 2: FIX CROSS-ORGANIZATION VIOLATIONS
-- ================================================================

-- Fix cross-org property assignments by nullifying invalid property_id
UPDATE maintenance_requests mr
SET property_id = NULL,
    updated_at = NOW()
FROM properties p
WHERE mr.property_id = p.id
  AND mr.property_id IS NOT NULL
  AND mr.organization_id != p.organization_id;

-- Fix cross-org user assignments by nullifying invalid user_id
UPDATE maintenance_requests mr
SET user_id = NULL,
    updated_at = NOW()
FROM profiles p
WHERE mr.user_id = p.id
  AND mr.user_id IS NOT NULL
  AND mr.organization_id != p.organization_id;

-- ================================================================
-- PART 3: FIX ORPHANED PROFILES
-- ================================================================

-- Create a default "Unassigned Users" organization for orphaned profiles
INSERT INTO public.organizations (id, name, slug, created_by)
VALUES (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'Unassigned Users',
  'unassigned-users',
  (SELECT id FROM auth.users LIMIT 1)
)
ON CONFLICT (id) DO NOTHING;

-- Assign orphaned profiles to the unassigned organization
UPDATE public.profiles
SET organization_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    updated_at = NOW()
WHERE organization_id IS NULL;

-- Create user_organizations entries for these users
INSERT INTO public.user_organizations (user_id, organization_id, role, is_active, is_default)
SELECT 
  p.id,
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  p.role,
  true,
  true
FROM public.profiles p
WHERE p.organization_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- ================================================================
-- PART 4: ADD VALIDATION TRIGGERS TO PREVENT FUTURE VIOLATIONS
-- ================================================================

-- Trigger function to validate property belongs to same organization
CREATE OR REPLACE FUNCTION public.validate_request_property_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  property_org_id UUID;
BEGIN
  -- Only validate if property_id is being set
  IF NEW.property_id IS NOT NULL THEN
    -- Get the property's organization
    SELECT organization_id INTO property_org_id
    FROM properties 
    WHERE id = NEW.property_id;
    
    -- If property not found or organization mismatch, raise error
    IF property_org_id IS NULL THEN
      RAISE EXCEPTION 'Property not found: %', NEW.property_id;
    END IF;
    
    IF NEW.organization_id != property_org_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Cannot assign property from organization % to request in organization %. Cross-organization property assignments are prohibited.', 
        property_org_id, NEW.organization_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function to validate user belongs to same organization
CREATE OR REPLACE FUNCTION public.validate_request_user_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Only validate if user_id is being set
  IF NEW.user_id IS NOT NULL THEN
    -- Get the user's organization
    SELECT organization_id INTO user_org_id
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- If user not found or organization mismatch, raise error
    IF user_org_id IS NULL THEN
      RAISE EXCEPTION 'User profile not found or has no organization: %', NEW.user_id;
    END IF;
    
    IF NEW.organization_id != user_org_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Cannot assign user from organization % to request in organization %. Cross-organization user assignments are prohibited.', 
        user_org_id, NEW.organization_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS validate_maintenance_request_property_org ON public.maintenance_requests;
DROP TRIGGER IF EXISTS validate_maintenance_request_user_org ON public.maintenance_requests;

-- Create triggers on maintenance_requests
CREATE TRIGGER validate_maintenance_request_property_org
  BEFORE INSERT OR UPDATE ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_request_property_organization();

CREATE TRIGGER validate_maintenance_request_user_org
  BEFORE INSERT OR UPDATE ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_request_user_organization();

-- ================================================================
-- PART 5: CLEANUP DUPLICATE CRON JOBS
-- ================================================================

-- Remove duplicate cron jobs (keep newer ones: #9 and #10)
-- Unschedule job #4 (auto-convert-expired-trials)
SELECT cron.unschedule('auto-convert-expired-trials');

-- Unschedule job #6 (send-trial-reminders)
SELECT cron.unschedule('send-trial-reminders');

-- ================================================================
-- PART 6: ADD RLS POLICIES FOR AUDIT TABLES
-- ================================================================

ALTER TABLE public.cross_org_property_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_org_user_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit data
CREATE POLICY "Admins can view property audit data"
ON public.cross_org_property_audit
FOR SELECT
TO authenticated
USING (get_current_user_role_safe() = 'admin');

CREATE POLICY "Admins can view user audit data"
ON public.cross_org_user_audit
FOR SELECT
TO authenticated
USING (get_current_user_role_safe() = 'admin');

-- ================================================================
-- VERIFICATION QUERIES (for logging)
-- ================================================================

-- Log the cleanup results
DO $$
DECLARE
  property_violations INT;
  user_violations INT;
  orphaned_profiles INT;
BEGIN
  -- Count remaining violations (should be 0)
  SELECT COUNT(*) INTO property_violations
  FROM maintenance_requests mr
  JOIN properties p ON mr.property_id = p.id
  WHERE mr.property_id IS NOT NULL 
    AND mr.organization_id != p.organization_id;
  
  SELECT COUNT(*) INTO user_violations
  FROM maintenance_requests mr
  JOIN profiles p ON mr.user_id = p.id
  WHERE mr.user_id IS NOT NULL
    AND mr.organization_id != p.organization_id;
  
  SELECT COUNT(*) INTO orphaned_profiles
  FROM profiles
  WHERE organization_id IS NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SECURITY FIXES COMPLETED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Remaining property violations: %', property_violations;
  RAISE NOTICE 'Remaining user violations: %', user_violations;
  RAISE NOTICE 'Remaining orphaned profiles: %', orphaned_profiles;
  RAISE NOTICE 'Duplicate cron jobs removed: 2';
  RAISE NOTICE 'Validation triggers added: 2';
  RAISE NOTICE '========================================';
  
  IF property_violations > 0 OR user_violations > 0 OR orphaned_profiles > 0 THEN
    RAISE WARNING 'Some violations remain! Manual intervention may be required.';
  ELSE
    RAISE NOTICE 'All security issues resolved successfully!';
  END IF;
END $$;