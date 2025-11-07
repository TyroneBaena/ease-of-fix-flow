# Tab Revisit v56.0 - CRITICAL FIX: Timeout Alignment & Architecture

## Root Causes Fixed

### 1. ✅ Timeout Mismatch
**Problem**: Coordination timeout (20s) < Query timeout (60s) = Zombie queries
**Fix**: Increased coordination timeout to 70s to exceed query timeout, allowing queries to complete or abort properly
**Result**: No more zombie queries running in background after timeout

### 2. ✅ Duplicate Session Ready Callback
**Problem**: Both `UnifiedAuthContext` AND `TabVisibilityContext` registered callbacks, overwriting each other
**Fix**: Removed callback from `UnifiedAuthContext`, kept only in `TabVisibilityContext`
**Result**: Single, predictable session ready check without race conditions

### 3. ✅ Missing Abort Controller
**Problem**: When coordination timed out, handlers continued running indefinitely
**Fix**: Added abort controller to cancel all in-flight handlers on timeout
**Result**: Clean timeout with no hanging operations

### 4. ✅ Insufficient Logging
**Problem**: Couldn't identify where the flow was hanging
**Fix**: Added granular logging at every step with visual separators
**Result**: Clear visibility into which step fails and how long each takes

### 5. ✅ Missing Session Validation
**Problem**: Session restoration claimed success but session wasn't actually set
**Fix**: Added Step 1.5 to validate session exists on client after restoration
**Result**: Catches session restoration failures early

## Technical Changes

### visibilityCoordinator.ts (v56.0)
```typescript
// Increased timeout to match query timeouts
const overallTimeout = 70000; // Was 20000

// Added abort controller
private abortController: AbortController | null = null;

// Abort on timeout
setTimeout(() => {
  this.abortController?.abort();
  reject(new Error('Overall coordination timeout'));
}, 70000);

// New Step 1.5: Validate session
const { data: { session }, error } = await supabaseClient.auth.getSession();
if (!session) throw new Error('Session validation failed');

// Granular logging
console.log("═══════════════════════════════════════════════════");
console.log("🚀 v56.0 - STEP 1: Restoring session...");
```

### UnifiedAuthContext.tsx (v56.0)
```typescript
// REMOVED duplicate session ready callback registration
// Now only registered in TabVisibilityContext to prevent collision
useEffect(() => {
  console.log('🔧 v56.0 - Registering error handler (callback in TabVisibilityContext)');
  // Only error handler, no session ready callback
}, []);
```

### TabVisibilityContext.tsx (v56.0)
```typescript
// Now the ONLY place that registers session ready callback
console.log('🔄 v56.0 - Starting coordinator (SINGLE callback registration)');
visibilityCoordinator.setSessionReadyCallback(() => {
  const current = authStateRef.current;
  return current.isSessionReady && !!current.currentUser?.id;
});
```

### sessionRehydration.ts (v56.0)
```typescript
// Enhanced logging at each step
console.log("📡 v56.0 - Backend response received in ${duration}ms");
console.log("🔍 v56.0 - Validating session data...");
console.log("🔐 v56.0 - setSession() completed in ${duration}ms");
```

## Flow Diagram (v56.0)

```
Tab Visible
    ↓
Show Loader + Set Coordination Lock
    ↓
╔═══════════════════════════════════════════════╗
║ STEP 1: Restore Session (with logging)       ║
║  - Fetch from backend                         ║
║  - Validate tokens exist                      ║
║  - Set on Supabase client                     ║
╚═══════════════════════════════════════════════╝
    ↓
╔═══════════════════════════════════════════════╗
║ STEP 1.5: Validate Session (NEW)             ║
║  - Call supabase.auth.getSession()            ║
║  - Verify session actually set                ║
║  - Log session details                        ║
╚═══════════════════════════════════════════════╝
    ↓
╔═══════════════════════════════════════════════╗
║ STEP 2: Wait for Session Ready               ║
║  - Check authStateRef.current (not closure)   ║
║  - Max 10s wait                               ║
║  - Log every 1s                               ║
╚═══════════════════════════════════════════════╝
    ↓
╔═══════════════════════════════════════════════╗
║ STEP 3: Run Handlers with Abort Support      ║
║  - Check abort signal before each handler     ║
║  - Log start/end time for each                ║
║  - Cancel all if timeout reached              ║
╚═══════════════════════════════════════════════╝
    ↓
Release Lock + Hide Loader
```

## Testing Checklist

✅ Login → Properties load immediately (v55.0 fix + v56.0 validation)
✅ Tab hide 10s → show → Properties load within 5s
✅ Multiple rapid tab switches → No accumulation (v54.0 fix)
✅ Tab revisit 10+ times → No timeout (v56.0 extended timeout)
✅ Login → Hide tab → Show tab → Data refreshes
✅ Query takes 60s → Coordination waits (v56.0 70s timeout)
✅ Overall timeout → All handlers abort cleanly (v56.0 abort controller)
✅ Session restoration fails → Clear error message (v56.0 validation)

## Architecture Improvements

1. **Single Source of Truth**: Only TabVisibilityContext registers session ready callback
2. **Timeout Hierarchy**: Coordination timeout (70s) > Query timeout (60s)
3. **Abort Propagation**: Timeout cascades to all in-flight operations
4. **Observable Execution**: Every step logged with duration and status
5. **Early Validation**: Session verified immediately after restoration

## Debugging Guide

When tab revisit fails, check logs for:

1. **Step 1 logs**: Did session fetch succeed? Status code?
2. **Step 1.5 logs**: Is session actually set on client?
3. **Step 2 logs**: How long did auth listener take? Did it timeout?
4. **Step 3 logs**: Which handler hung? How long did it take?
5. **Overall timeout**: Did it reach 70s? Were handlers aborted?

Each step has clear visual separators (═══) making it easy to identify failures.
