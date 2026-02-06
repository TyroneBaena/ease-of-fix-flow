-- =============================================
-- SECURITY HARDENING MIGRATION
-- Phase 1: Fix function search_path vulnerabilities
-- Phase 2: RLS Policy Hardening
-- Phase 4: Role Self-Update Prevention
-- =============================================

-- =============================================
-- PHASE 1: Database Function Security
-- Fix SQL Injection via Mutable Search Path
-- =============================================

-- 1. Fix update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. Fix is_first_user_signup
CREATE OR REPLACE FUNCTION public.is_first_user_signup()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- For now, every new signup creates their own organization and becomes admin
    -- This matches the Phase 3 requirement where each user gets their own organization
    RETURN TRUE;
END;
$function$;

-- 3. Fix get_appropriate_user_role
CREATE OR REPLACE FUNCTION public.get_appropriate_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- In Phase 3, every user creates their own organization and becomes admin
    RETURN 'admin';
END;
$function$;

-- 4. Create/Fix audit_user_role_changes if it exists or create it
CREATE OR REPLACE FUNCTION public.audit_user_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log role changes to activity_logs
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (
      organization_id,
      action_type,
      description,
      actor_name,
      metadata
    ) VALUES (
      (SELECT organization_id FROM public.profiles WHERE id = NEW.user_id),
      'role_assigned',
      'Role ' || NEW.role || ' assigned to user',
      (SELECT name FROM public.profiles WHERE id = auth.uid()),
      jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.activity_logs (
      organization_id,
      action_type,
      description,
      actor_name,
      metadata
    ) VALUES (
      (SELECT organization_id FROM public.profiles WHERE id = NEW.user_id),
      'role_changed',
      'Role changed from ' || OLD.role || ' to ' || NEW.role,
      (SELECT name FROM public.profiles WHERE id = auth.uid()),
      jsonb_build_object('user_id', NEW.user_id, 'old_role', OLD.role, 'new_role', NEW.role)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_logs (
      organization_id,
      action_type,
      description,
      actor_name,
      metadata
    ) VALUES (
      (SELECT organization_id FROM public.profiles WHERE id = OLD.user_id),
      'role_revoked',
      'Role ' || OLD.role || ' revoked from user',
      (SELECT name FROM public.profiles WHERE id = auth.uid()),
      jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role)
    );
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't block the operation if logging fails
    RAISE LOG 'Failed to audit role change: %', SQLERRM;
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
END;
$function$;

-- 5. Create/Fix initialize_property_counts if it exists
CREATE OR REPLACE FUNCTION public.initialize_property_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_record RECORD;
  property_count integer;
BEGIN
  -- Loop through all users who have properties
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM public.properties 
    WHERE user_id IS NOT NULL
  LOOP
    -- Count properties for this user
    SELECT COUNT(*) INTO property_count
    FROM public.properties 
    WHERE user_id = user_record.user_id;
    
    -- Update subscriber record if exists
    UPDATE public.subscribers 
    SET active_properties_count = property_count,
        updated_at = now()
    WHERE user_id = user_record.user_id;
  END LOOP;
  
  RAISE LOG 'Property counts initialized for all users';
END;
$function$;

-- =============================================
-- PHASE 2A: Security Events INSERT Policy
-- Restrict to authenticated users only
-- =============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can insert security events" ON public.security_events;

-- Create restricted policy - only authenticated users can insert their own events
CREATE POLICY "Authenticated users can insert security events"
ON public.security_events
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);

-- =============================================
-- PHASE 2B: Email Relay Keys - Add Anonymous Denial
-- =============================================

-- Add explicit denial policy for anonymous access
DROP POLICY IF EXISTS "Deny public access to email relay keys" ON public.email_relay_keys;

CREATE POLICY "Deny public access to email relay keys"
ON public.email_relay_keys
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- =============================================
-- PHASE 4: Role Self-Update Prevention Trigger
-- Prevents privilege escalation attacks
-- =============================================

-- Create the prevention function
CREATE OR REPLACE FUNCTION public.prevent_role_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- If role is being changed and user is updating their own profile
  IF NEW.role IS DISTINCT FROM OLD.role AND NEW.id = auth.uid() THEN
    -- Check if current user is NOT an admin in user_roles
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
      -- Also check profiles.role as fallback
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
      ) THEN
        RAISE EXCEPTION 'Users cannot modify their own role';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS prevent_role_self_update_trigger ON public.profiles;

-- Create the trigger
CREATE TRIGGER prevent_role_self_update_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_self_update();