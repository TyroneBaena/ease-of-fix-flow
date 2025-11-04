# Tab Revisit Query Timeout - Final Fix

## Problem

Queries were timing out on **every** tab revisit (even the first one), showing:
- "SubscriptionContext - Query timed out, using fallback state"
- "Quotes fetch timeout after 10s"
- "Contractor status check timeout after 10s"
- "Activity logs fetch timeout after 10s"

## Root Cause Analysis

### The Core Issue
**TWO SEPARATE visibility handlers were running simultaneously**, causing conflicts:

1. **`client.ts` handler (lines 305-333)**: 
   - Fired 4 times per visibility change (multiple imports)
   - Only handled Realtime disconnect/reconnect
   - Did NOT trigger session restoration
   - Created race conditions

2. **`visibilityCoordinator` handler**: 
   - Was registered in `UnifiedAuthContext` but **NEVER started**
   - The `TabVisibilityProvider.startListening()` should have initialized it
   - All session restoration logic was unreachable
   - The 5-second threshold prevented quick tab switches from triggering

### Evidence from Console Logs
```
👀 Tab hidden — disconnecting Realtime temporarily...  (4x - from client.ts)
👀 Tab visible again — reconnecting Realtime...        (4x - from client.ts)
🔌 Reconnecting Supabase Realtime...                   (4x - from client.ts)

MISSING LOGS (never appeared):
✗ 🔄 TabVisibilityProvider - Starting coordinator
✗ 👀 VisibilityCoordinator started listening for tab visibility changes
✗ 📝 Registered refresh handler
✗ 🔓 Tab visible again after Xs
✗ 🔁 Coordinating refresh
✗ 🍪 Attempting to restore session from cookie
```

## The Fix

### 1. Removed Duplicate Listener (`client.ts`)
**Before:**
```typescript
// client.ts had its own visibilitychange listener
document.addEventListener("visibilitychange", async () => {
  if (document.hidden) {
    supabase.realtime.disconnect();
    forceSessionBackup(session);
  } else {
    reconnectRealtime();
  }
});
```

**After:**
```typescript
// REMOVED: Duplicate visibility listener - now handled by visibilityCoordinator
```

### 2. Enhanced `visibilityCoordinator` (`visibilityCoordinator.ts`)

**Added Pre-Hide Logic:**
```typescript
private handleVisibilityChange = async () => {
  if (document.hidden) {
    // Disconnect Realtime
    const { supabase } = await import('@/integrations/supabase/client');
    supabase.realtime.disconnect();
    
    // Force session backup BEFORE tab hides
    const { forceSessionBackup } = await import('@/integrations/supabase/client');
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      forceSessionBackup(session);
    }
  }
```

**Removed 5-Second Threshold:**
```typescript
// OLD: Only refresh if tab was hidden for more than 5 seconds
if (hiddenDuration > 5000) {
  this.coordinateRefresh();
}

// NEW: Always refresh on tab revisit
this.coordinateRefresh();
```

**Moved Realtime Reconnection:**
```typescript
private async coordinateRefresh() {
  // ... auth handler runs first ...
  
  if (authSuccess === true) {
    console.log("✅ Auth handler completed, session and user restored");
    
    // Wait 1200ms for state propagation
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // THEN reconnect Realtime
    const { supabase } = await import('@/integrations/supabase/client');
    await supabase.realtime.connect();
    console.log("🟢 Realtime reconnection successful");
  }
```

### 3. UnifiedAuthContext Registration (unchanged)
The registration was already correct - it just wasn't being triggered:
```typescript
useEffect(() => {
  const refreshAuth = async (): Promise<boolean> => {
    // Multi-layer session restoration with retry
    // 1. Check in-memory session
    // 2. Try localStorage
    // 3. Try cookie backup
    // 4. Retry up to 5 times
    // 5. Return success/failure
  };

  const unregister = visibilityCoordinator.onRefresh(refreshAuth);
  return () => unregister();
}, []);
```

## The Complete Flow (After Fix)

1. **Tab Hidden:**
   ```
   visibilityCoordinator → handleVisibilityChange()
   ├─ Disconnect Realtime
   ├─ Backup session to cookie
   └─ Set lastHiddenTime
   ```

2. **Tab Visible:**
   ```
   visibilityCoordinator → coordinateRefresh()
   ├─ Execute auth handler (UnifiedAuthContext.refreshAuth)
   │  ├─ Quick check: in-memory session
   │  ├─ Layer 1: localStorage session
   │  ├─ Layer 2: Cookie backup session
   │  └─ Retry up to 5 times with delays
   ├─ Wait 1200ms for state propagation
   ├─ Reconnect Realtime
   └─ Execute data handlers (queries can now succeed)
   ```

## Testing Instructions

1. **Log in to the app**
2. **Hide the tab** (switch to another tab) - Watch for:
   ```
   🔒 Tab hidden at [timestamp]
   👀 Tab hidden — disconnecting Realtime temporarily...
   💾 Pre-hide session backup successful
   ```

3. **Return to the tab** - Watch for:
   ```
   🔓 Tab visible again after [duration]s
   🔁 Coordinating refresh (1 handlers registered)...
   ⚡ UnifiedAuth v28.0 - Quick session check (in-memory)...
   ✅ UnifiedAuth v28.0 - Quick session check: Valid session found!
   ✅ Auth handler completed, session and user restored
   ✅ Auth propagation complete, ready for data queries
   🔌 Reconnecting Supabase Realtime...
   🟢 Realtime reconnection successful
   ```

4. **Check data loads correctly** - NO timeout errors:
   ```
   ✅ Quotes load successfully
   ✅ Contractor status loads
   ✅ Activity logs load
   ✅ No "using fallback state" messages
   ```

## Why This Works

1. **Single Source of Truth**: Only one visibility listener (in coordinator)
2. **Proper Initialization**: TabVisibilityProvider starts the coordinator
3. **Complete Pre-Hide Backup**: Session saved BEFORE tab becomes inactive
4. **Coordinated Refresh**: Auth runs first, then data queries with authenticated context
5. **Adequate Propagation Time**: 1200ms delay ensures session is fully restored
6. **Realtime Timing**: Reconnects AFTER auth completes, with valid session

## Key Takeaway

**Never have multiple `visibilitychange` listeners!** They create race conditions and conflicts. Use a single coordinator that orchestrates all visibility-related logic in the correct order.
