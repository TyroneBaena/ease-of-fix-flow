# Tab Revisit Session Persistence Fix

## Problem
When users left the app tab inactive for a period and returned, queries would fail with "No valid session" errors, forcing them to re-login.

### Symptoms
- Console logs showed: "No session in cookie, user may need to re-login"
- "⚠️ No active session while reconnecting Realtime"
- All database queries failed after tab revisit
- User had to manually refresh or re-login

### Root Cause Analysis

**The app had THREE conflicting session persistence mechanisms:**

1. **Supabase's Built-in Persistence** (lines in `client.ts`):
   ```typescript
   auth: {
     persistSession: true,  // ✅ Automatically saves to localStorage
   }
   ```

2. **Custom Cookie Logic** (lines 127-137 in `client.ts`):
   ```typescript
   supabase.auth.onAuthStateChange((event, session) => {
     if (session?.access_token) {
       setCookie(COOKIE_NAME, JSON.stringify(session)); // ❌ Redundant
     }
   });
   ```

3. **Cookie Restoration** (lines 140-155 in `client.ts` + UnifiedAuthContext):
   ```typescript
   export async function restoreSessionFromCookie() {
     const cookieValue = getCookie(COOKIE_NAME);
     // ... ❌ Trying to restore from cookies instead of localStorage
   }
   ```

**Why This Failed:**
- Supabase **already** persists sessions to `localStorage` when `persistSession: true` is set
- The custom cookie code was redundant and added unnecessary complexity
- Cookies have size limits (4KB) and can expire or be cleared by browsers
- The app tried to restore from cookies that might not exist, instead of using Supabase's built-in localStorage mechanism
- `supabase.auth.getSession()` **automatically** reads from localStorage, so manual restoration was unnecessary

## Solution Implemented

### Changed Files

#### 1. `src/integrations/supabase/client.ts`
**Removed duplicate session restoration from visibility listener:**

```typescript
// BEFORE:
document.addEventListener("visibilitychange", async () => {
  if (!document.hidden) {
    await restoreSessionFromCookie(); // ❌ Duplicate, unnecessary
    reconnectRealtime();
  }
});

// AFTER:
document.addEventListener("visibilitychange", async () => {
  if (!document.hidden) {
    // Session restoration happens in UnifiedAuthContext via coordinator
    reconnectRealtime(); // ✅ Only handle Realtime connection
  }
});
```

**Why:** Session restoration should be centralized in one place (UnifiedAuthContext), not scattered across multiple files.

#### 2. `src/contexts/UnifiedAuthContext.tsx`
**Simplified to use ONLY Supabase's built-in localStorage persistence:**

```typescript
// BEFORE (v23.0):
const refreshAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    // Try to restore from cookie ❌
    const restoredSession = await restoreSessionFromCookie();
    if (restoredSession) {
      // Convert and set user...
    }
  }
};

// AFTER (v24.0):
const refreshAuth = async () => {
  // Supabase's getSession() automatically reads from localStorage ✅
  const { data: { session: currentSession } } = await supabase.auth.getSession();
  
  if (currentSession?.access_token) {
    // Session found in localStorage - convert user if needed
    const user = await convertSupabaseUser(currentSession.user);
    setCurrentUser(user);
    setSession(currentSession);
  }
};
```

**Why:** `supabase.auth.getSession()` already reads from localStorage. No custom cookie logic needed!

**Added dependency on `currentUser`:**
```typescript
}, [currentUser]); // ✅ Re-run if currentUser changes
```

## How It Works Now

### Session Lifecycle

1. **User Logs In:**
   - Supabase automatically saves session to `localStorage` (via `persistSession: true`)
   - `onAuthStateChange` fires → `setCurrentUser()` and `setSession()` update React state

2. **Tab Goes Inactive:**
   - Browser may suspend JS execution
   - Supabase session remains in `localStorage` (persistent across browser sessions)

3. **User Returns to Tab (Coordinator Refresh Triggers):**
   ```
   ┌─────────────────────────────────────────┐
   │ visibilityCoordinator detects tab focus │
   │ (after 5+ seconds hidden)               │
   └──────────────┬──────────────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────────────┐
   │ UnifiedAuthContext.refreshAuth() runs   │
   │ Calls: supabase.auth.getSession()       │
   └──────────────┬──────────────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────────────┐
   │ Supabase reads from localStorage        │
   │ Returns valid session automatically     │
   └──────────────┬──────────────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────────────┐
   │ If session exists:                      │
   │ - Convert user (with profile data)      │
   │ - Set currentUser & session in React    │
   │ - All queries now have auth context ✅  │
   └─────────────────────────────────────────┘
   ```

4. **Data Queries Execute:**
   - Auth context is restored
   - All RLS-filtered queries work correctly

## Benefits

✅ **Simpler Code:** Removed redundant cookie logic, rely on Supabase's built-in persistence  
✅ **More Reliable:** localStorage is more stable than cookies (no size limits, no expiry issues)  
✅ **Single Source of Truth:** All session restoration happens through `supabase.auth.getSession()`  
✅ **Better Performance:** No unnecessary cookie parsing/writing on every auth state change  
✅ **Clearer Logs:** Version bumped to v24.0 with "from localStorage" messaging  

## Testing

### Test Scenarios

1. **Short Tab Switch (< 5s):**
   - Expected: No coordinator refresh, queries work immediately
   - Session: Still in memory

2. **Medium Tab Switch (5-60s):**
   - Expected: Coordinator refresh, session restored from localStorage
   - Console: "Valid session found (from localStorage)"

3. **Long Inactivity (> 5 minutes):**
   - Expected: Coordinator refresh, session restored from localStorage
   - Console: "Valid session found (from localStorage)"
   - All queries: Work correctly with authenticated context

4. **Browser Restart:**
   - Expected: Session persists, user stays logged in
   - localStorage: Contains valid Supabase session

### Expected Console Logs

```
# Tab becomes visible after inactivity:
🔓 Tab visible again after 145.2s
🔁 Coordinating refresh (2 handlers registered)...
🔄 UnifiedAuth v24.0 - Coordinator-triggered session check
🔄 UnifiedAuth v24.0 - Valid session found (from localStorage) ✅
🔄 UnifiedAuth v24.0 - User already set, session valid
✅ Auth handler completed, session and user restored
```

### What Should NOT Appear Anymore

❌ "No session in cookie, user may need to re-login"  
❌ "Failed to parse cookie session"  
❌ Database query failures after tab revisit  

## Key Takeaways

1. **Trust Supabase's Built-in Persistence:** Don't reinvent the wheel with custom cookies
2. **Centralize Session Logic:** One place for session restoration (UnifiedAuthContext)
3. **Let the Library Do Its Job:** `persistSession: true` + `getSession()` is all you need
4. **Separation of Concerns:** `client.ts` manages Realtime, `UnifiedAuthContext` manages auth state

## Future Considerations

### If Session Still Expires
If users report sessions expiring after long periods (days/weeks):
- Check Supabase project settings for refresh token expiry
- Verify `autoRefreshToken: true` is working
- Consider adding a "Welcome back" re-authentication flow

### Cookie Code Removal (Optional)
The cookie helper functions (lines 97-110) and cookie sync (lines 127-137) in `client.ts` can be fully removed in a future cleanup since they're no longer used for session persistence.
