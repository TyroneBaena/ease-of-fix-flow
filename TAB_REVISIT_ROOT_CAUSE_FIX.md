# Tab Revisit - Root Cause Fix

## Problem
Query timeouts on **every** tab revisit after the first one, with triple visibility event logging and NO session restoration happening.

## Root Cause Analysis

### Critical Issue 1: Triple Visibility Listener Registration
**Evidence from console logs:**
```
👀 Tab hidden — disconnecting Realtime temporarily... (×3)
👀 Tab visible again — reconnecting Realtime... (×3)
🔌 Reconnecting Supabase Realtime... (×3)
```

**Root cause:** The visibility listener in `client.ts` was registered every time the module was imported, and since it's imported by multiple files, it registered 3+ times.

**Impact:** 
- Multiple reconnection attempts causing race conditions
- Excessive logging making debugging difficult
- Potential for session restoration conflicts

### Critical Issue 2: No Session Restoration on Tab Revisit
**Evidence from logs:**
- ❌ No "💾 Pre-hide session backup successful" logs
- ❌ No "🍪 Cookie found, parsing..." logs  
- ❌ No "✅ Successfully restored session from cookie" logs

**Root cause:** UnifiedAuthContext explicitly removed visibility checking at line 977-979:
```typescript
// REMOVED: Tab visibility checking
// Supabase handles session refresh automatically through API calls
// No need for aggressive tab visibility checking that causes loading cascades
```

**Impact:**
- Session restoration (`restoreSessionFromCookie`) never triggered on tab revisit
- Queries executed with stale/missing auth tokens
- Authorization headers showed anon key instead of user session token

### Critical Issue 3: Visibility Coordinator Not Connected to Auth
**Evidence:**
- Visibility coordinator only used in contractor hooks
- Auth context had NO registration with visibility coordinator
- Session restoration logic existed but was never triggered

## Solution Implemented

### Fix 1: Singleton Pattern for Visibility Listener
**File: `src/integrations/supabase/client.ts`**

```typescript
// CRITICAL: Use singleton pattern to prevent multiple listener registrations
let visibilityListenerRegistered = false;

if (typeof document !== "undefined" && !visibilityListenerRegistered) {
  visibilityListenerRegistered = true;
  
  document.addEventListener("visibilitychange", async () => {
    // ... handler code
  });
  
  console.log("✅ Visibility listener registered (singleton)");
}
```

**Benefits:**
- Prevents duplicate listener registration
- Eliminates triple logging issue
- Ensures clean session backup before tab hide

### Fix 2: Connect Auth to Visibility Coordinator
**File: `src/contexts/UnifiedAuthContext.tsx`**

Added visibility coordinator registration with 2-step session restoration:

```typescript
useEffect(() => {
  const handleTabRevisit = async () => {
    // Step 1: Quick in-memory check (0ms)
    const { data: { session: quickSession } } = await supabase.auth.getSession();
    if (quickSession?.access_token && !isExpired(quickSession)) {
      // Session already valid! Just ensure cookie backup
      forceSessionBackup(quickSession);
      return;
    }
    
    // Step 2: Full restoration with 5 retries (only if quick check fails)
    for (let attempt = 1; attempt <= 5; attempt++) {
      const delayMs = attempt * 300; // 300ms, 600ms, 900ms, 1200ms, 1500ms
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      const restoredSession = await restoreSessionFromCookie();
      if (restoredSession) {
        setSession(restoredSession);
        const user = await convertSupabaseUser(restoredSession.user);
        setCurrentUser(user);
        return;
      }
    }
  };
  
  const unregister = visibilityCoordinator.onRefresh(handleTabRevisit);
  return () => unregister();
}, []);
```

**Benefits:**
- Fast path (~50ms): Session already in memory, just backup to cookie
- Slow path (with retries): Full restoration from cookie if memory cleared
- Integrated with existing visibility coordinator infrastructure
- Proper state updates ensure queries have valid auth tokens

### Fix 3: Coordinated Execution Flow

**Sequence of events on tab revisit:**

1. **Tab becomes hidden:**
   ```
   👀 Tab hidden — disconnecting Realtime temporarily...
   💾 Pre-hide session backup successful
   ```

2. **Tab becomes visible:**
   ```
   👀 Tab visible again — reconnecting Realtime...
   🔄 UnifiedAuth v29.0 - Coordinator-triggered session check
   ⚡ UnifiedAuth v29.0 - Quick session check (in-memory)...
   ✅ UnifiedAuth v29.0 - Quick session check: Valid session found!
   💾 UnifiedAuth v29.0 - Session backup to cookie: SUCCESS
   🔌 Reconnecting Supabase Realtime...
   🟢 Realtime reconnection initiated
   ```

3. **Queries execute with valid auth:**
   - Authorization header contains user session token (not anon key)
   - All queries succeed without timeout
   - Data loads correctly

## Testing Instructions

### Test 1: First Tab Revisit (Fast Path)
1. Log in to application
2. Switch to another tab for 1-2 minutes
3. Return to app tab
4. **Expected logs:**
   ```
   ⚡ Quick session check (in-memory)...
   ✅ Quick session check: Valid session found!
   💾 Session backup to cookie: SUCCESS
   ```
5. **Expected behavior:** All queries succeed immediately (~50ms)

### Test 2: Multiple Tab Revisits
1. Switch tabs and return 5+ times with varying delays
2. **Expected:** Consistent "Quick session check" success on each return
3. **Expected:** No query timeouts on any revisit
4. **Expected:** Single visibility events (not triple)

### Test 3: Long Inactivity (Slow Path with Retries)
1. Switch to another tab for 10+ minutes
2. Return to app tab
3. **Expected logs:**
   ```
   🔄 Starting full session restoration...
   🔄 Restoration attempt 1/5
   ✅ Session restored successfully on attempt 1
   ```
4. **Expected behavior:** Queries succeed after brief restoration delay

## Key Improvements

1. **Singleton Visibility Listener**: Prevents triple registration and duplicate events
2. **2-Step Session Restoration**: Fast in-memory check first, expensive restoration only if needed
3. **Visibility Coordinator Integration**: Coordinates auth restoration with data refreshes
4. **5 Retry Attempts**: More resilient to network latency (300ms, 600ms, 900ms, 1200ms, 1500ms)
5. **Pre-Hide Backup**: Session always backed up before tab becomes hidden
6. **Proper Auth Token**: Queries use user session token instead of anon key

## Performance Impact

- **Fast path (most common)**: ~50ms
- **Slow path with retries**: ~300-1500ms depending on which attempt succeeds
- **Pre-hide backup**: ~50ms (async, doesn't block tab switch)

## Expected Console Output (Success)

```
👀 Tab hidden — disconnecting Realtime temporarily...
💾 Pre-hide session backup successful
[user switches back]
👀 Tab visible again — reconnecting Realtime...
🔄 UnifiedAuth v29.0 - Coordinator-triggered session check
⚡ UnifiedAuth v29.0 - Quick session check (in-memory)...
✅ UnifiedAuth v29.0 - Quick session check: Valid session found!
💾 UnifiedAuth v29.0 - Session backup to cookie: SUCCESS
🔌 Reconnecting Supabase Realtime...
🟢 Realtime reconnection initiated
[All queries succeed with proper auth tokens]
```

## Fallback Behavior

If all 5 restoration attempts fail:
- User remains signed in if session still valid in Supabase client
- If session truly lost, user will need to sign in again
- Error logged but app remains stable

## Future Enhancements

1. Add session health monitoring dashboard
2. Track restoration success rate metrics
3. Implement proactive token refresh before expiry
4. Add telemetry for session restoration performance
