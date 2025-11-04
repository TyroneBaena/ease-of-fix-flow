# Tab Revisit Race Condition Fix

## Problem

When a user returned to the tab after inactivity, all queries would fail with timeouts:
- Quotes fetch timeout
- Contractor status check timeout  
- Activity logs fetch timeout
- Properties fetch timeout
- Request fetch timeout

Console showed: `⚠️ No active session while reconnecting Realtime`

## Root Cause Analysis

**Race Condition between two systems:**

1. **`client.ts` visibility handler** - fires immediately when tab becomes visible
   - Tries to reconnect Realtime
   - Checks for session via `supabase.auth.getSession()`
   - Gets `null` because session not restored yet
   - Logs warning and fails to reconnect

2. **`visibilityCoordinator` + `UnifiedAuthContext`** - runs in background
   - Takes ~800ms to complete
   - Properly restores session from localStorage
   - Sets user and session state in React context

**Timeline of the bug:**
```
T+0ms:    Tab becomes visible
T+0ms:    client.ts tries to reconnect Realtime → NO SESSION → FAILS
T+800ms:  visibilityCoordinator restores session → TOO LATE
T+1000ms: All queries run without auth → TIMEOUT
```

## Solution

**Remove premature session check in Realtime reconnection:**

1. Don't check for session in `reconnectRealtime()` - creates race condition
2. Increase reconnection delay to 1500ms (after session restoration completes)
3. Let Supabase use the restored session automatically when queries run
4. Supabase's built-in session persistence handles everything internally

## Changes Made

### `src/integrations/supabase/client.ts`

**Before:**
```typescript
function reconnectRealtime() {
  reconnectTimeout = setTimeout(async () => {
    const { data } = await supabase.auth.getSession(); // ❌ Race condition
    if (data?.session?.access_token) {
      await supabase.realtime.connect();
    } else {
      console.warn("⚠️ No active session"); // This was always showing
    }
  }, 1000);
}
```

**After:**
```typescript
function reconnectRealtime() {
  reconnectTimeout = setTimeout(async () => {
    // Don't check session - let visibilityCoordinator handle it
    await supabase.realtime.connect(); // ✅ Uses restored session automatically
    console.log("🟢 Realtime reconnection initiated");
  }, 1500); // Wait for session restoration to complete
}
```

## How Session Restoration Actually Works

1. Supabase already has `persistSession: true` in client config
2. Sessions are automatically stored in `localStorage`
3. `visibilityCoordinator` calls `supabase.auth.getSession()` which reads from localStorage
4. No custom cookies needed - Supabase handles everything
5. Once session is restored, all queries work automatically

## Testing

1. Login to the app
2. Switch to another tab for 10+ seconds
3. Switch back to the app tab
4. ✅ Should see: "Realtime reconnection initiated" (no warnings)
5. ✅ All queries should work immediately
6. ✅ No timeout errors in console

## Key Takeaway

**Don't fight Supabase's built-in session persistence.**
- It already works perfectly via localStorage
- Race conditions happen when trying to manually check sessions
- Let the coordinator restore sessions in the proper order
- Realtime will use the restored session automatically
