
# Security Hardening Plan for Housing Hub

## Executive Summary
This plan addresses all identified security issues while preserving existing functionality. The fixes are organized by priority and impact, with careful consideration for not breaking any current features.

---

## Phase 1: Database Function Security (High Priority)
**Risk: SQL Injection via Mutable Search Path**

Five database functions lack explicit `search_path` settings, making them vulnerable to search path manipulation attacks.

### Functions to Fix:
| Function | Risk Level |
|----------|------------|
| `audit_user_role_changes` | Medium - Trigger function |
| `get_appropriate_user_role` | Low - Returns static value |
| `initialize_property_counts` | Medium - Modifies data |
| `is_first_user_signup` | Low - Returns static value |
| `update_updated_at_column` | Low - Simple trigger |

### Implementation:
Create SQL migration to recreate each function with `SET search_path TO 'public'`:

```text
For each function, add:
  SET search_path TO 'public'
after SECURITY DEFINER (if present)
```

**Example fix for `update_updated_at_column`:**
```sql
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
```

**Impact:** None on existing functionality - functions behave identically.

---

## Phase 2: RLS Policy Hardening (Medium Priority)

### Issue 2A: Security Events INSERT Policy Too Permissive
**Current:** `WITH CHECK (true)` allows any user (including `anon`) to insert security events.

**Risk:** Attackers could flood the security_events table with fake entries or manipulate logs.

**Fix:** Restrict to service role or authenticated users only:

```sql
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

-- Service role (edge functions) can insert any events - no policy needed, 
-- service role bypasses RLS
```

**Impact:** Edge functions using service role key continue working. Client-side logging (if any) now requires authentication.

### Issue 2B: Email Relay Keys - Add Anonymous Denial
**Current:** Only SELECT policy exists for authenticated recipients.

**Risk:** No explicit denial for anonymous users on INSERT/UPDATE/DELETE.

**Fix:** Add explicit denial policy for anonymous access:

```sql
CREATE POLICY "Deny public access to email relay keys"
ON public.email_relay_keys
FOR ALL
TO anon
USING (false)
WITH CHECK (false);
```

**Impact:** None - anonymous users already can't access due to no policies granting access.

---

## Phase 3: Address Security Scan Findings

### Issue 3A: Profiles Table Security (False Positive - Already Fixed)
The security scan flagged the profiles table, but review shows:
- `Deny public access to profiles` policy with `USING (false)` correctly blocks anonymous access
- `Users can view only their own profile` restricts authenticated users
- `Admins and managers can view organization profiles` has proper org-based restrictions

**Action:** Mark this finding as resolved/ignored with explanation - no code changes needed.

### Issue 3B: Admin User List View (Already Fixed)
Review shows `security_invoker=true` is already set on `admin_user_list` view, meaning it inherits RLS from the `profiles` table.

**Action:** Mark this finding as resolved/ignored - no code changes needed.

---

## Phase 4: Role Security Verification

### Current Architecture Assessment
The application uses a dual-role system:
1. **`profiles.role`** - Legacy role column (text, NOT NULL)
2. **`user_roles` table** - Proper role system with `app_role` enum

**Current Code Behavior:**
- `UnifiedAuthContext` fetches role from `profiles.role` (line 384)
- Falls back to organization-based roles from `user_organizations.role`
- `has_role()` function correctly uses `user_roles` table

**Potential Issue:** The `profiles.role` column could be exploited if RLS policies don't prevent users from updating their own role.

### Verification Required:
Review profile UPDATE policies to ensure users cannot modify their own `role` column.

**Current UPDATE policy:**
```sql
"Users can update their own profile" 
WITH CHECK (id = auth.uid())
```

This allows updating ANY column including `role`. 

### Recommended Fix - Option A (Database Trigger):
Create a trigger to prevent role modification via profiles table:

```sql
CREATE OR REPLACE FUNCTION prevent_role_self_update()
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
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Users cannot modify their own role';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER prevent_role_self_update_trigger
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_role_self_update();
```

**Impact:** Prevents privilege escalation. Admins can still update roles.

---

## Phase 5: Documentation Updates for Manual Actions

These items require manual action in Supabase Dashboard (cannot be automated):

### 5A: Enable Leaked Password Protection
**Location:** [Auth Providers Settings](https://supabase.com/dashboard/project/ltjlswzrdgtoddyqmydo/auth/providers)
**Action:** Enable "Check for leaked passwords" toggle
**Time:** 2 minutes

### 5B: Upgrade Postgres Version
**Location:** [Infrastructure Settings](https://supabase.com/dashboard/project/ltjlswzrdgtoddyqmydo/settings/infrastructure)
**Action:** Click "Upgrade" to apply security patches
**Time:** 10-15 minutes (includes brief downtime)

---

## Implementation Summary

| Phase | Files/Resources Changed | Risk | Impact on Features |
|-------|------------------------|------|-------------------|
| Phase 1 | SQL Migration (5 functions) | Low | None |
| Phase 2A | SQL Migration (1 policy) | Low | None if using service role |
| Phase 2B | SQL Migration (1 policy) | Low | None |
| Phase 3 | Security findings update | None | None |
| Phase 4 | SQL Migration (1 trigger) | Medium | Blocks role self-modification |
| Phase 5 | Manual dashboard actions | Low | None |

---

## Testing Plan

After implementation:
1. Verify all authenticated features still work (login, data access, CRUD operations)
2. Test that anonymous users cannot access protected tables
3. Verify admin role management still functions correctly
4. Confirm security events are still being logged by edge functions
5. Run security scan to verify all issues are resolved

---

## Rollback Plan

Each SQL migration will include corresponding rollback statements:
- Functions: Recreate without `SET search_path`
- Policies: Recreate original policies
- Trigger: `DROP TRIGGER IF EXISTS prevent_role_self_update_trigger`

All changes are additive or cosmetic (search_path) and can be safely reversed.
