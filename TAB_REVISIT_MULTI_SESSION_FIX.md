# Tab Revisit Multi-Session Fix v26.0

## Problem: Second Tab Revisit Failing

### User Report
- **First tab revisit**: Works perfectly ✅
- **Second+ tab revisits**: Queries fail with "localStorage and cookies both empty" ❌

### Root Cause Analysis

#### Why First Revisit Works
1. User logs in → Session saved to localStorage + cookie
2. User navigates away (tab hidden)
3. User returns → Session restored from localStorage
4. Queries execute successfully

#### Why Second Revisit Fails
1. After first successful restoration, user navigates away again
2. Supabase `onAuthStateChange` fires with `null` session (temporary state)
3. Cookie deletion logic triggers: `if (!session) deleteCookie()`
4. Browser may also clear localStorage during inactivity
5. Next revisit → both storage locations empty → restoration fails

### The Cookie Deletion Bug

**Original Code (PROBLEMATIC):**
```typescript
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session?.access_token) {
    setCookie(COOKIE_NAME, JSON.stringify(session));
  } else {
    deleteCookie(COOKIE_NAME); // ❌ DELETES on every null session!
  }
});
```

**Problem**: `onAuthStateChange` fires with `null` session in many scenarios:
- Tab switching (before restoration completes)
- Temporary auth state transitions
- Component remounts
- Token refresh cycles

This caused premature cookie deletion, breaking subsequent tab revisits.

## Solution Implemented

### 1. Smart Cookie Management (client.ts)

**Only delete cookies on explicit sign-out:**
```typescript
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === "SIGNED_OUT") {
    // ✅ Only delete on actual logout
    deleteCookie(COOKIE_NAME);
  } else if (session?.access_token) {
    // Validate session before saving
    const isExpired = /* check expiry */;
    if (!isExpired) {
      setCookie(COOKIE_NAME, JSON.stringify(session));
    }
  }
});
```

### 2. Enhanced Session Restoration (client.ts)

**Added session validation and forced backup:**
```typescript
export async function restoreSessionFromCookie() {
  const cookieValue = getCookie(COOKIE_NAME);
  const session = JSON.parse(cookieValue);
  
  // Validate session isn't expired
  const isExpired = /* check expiry */;
  if (isExpired) {
    deleteCookie(COOKIE_NAME);
    return null;
  }
  
  await supabase.auth.setSession(session);
  // Re-save to refresh expiry
  setCookie(COOKIE_NAME, JSON.stringify(session));
  return session;
}

// New: Force session backup after restoration
export function forceSessionBackup(session: any) {
  setCookie(COOKIE_NAME, JSON.stringify(session));
}
```

### 3. Retry Logic + Forced Backup (UnifiedAuthContext.tsx)

**v26.0 with retry and forced backup:**
```typescript
const refreshAuth = async (): Promise<boolean> => {
  // Retry up to 2 times with 1s delay
  for (let attempt = 1; attempt <= 2; attempt++) {
    // LAYER 1: Try localStorage
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token && !isExpired(session)) {
      // ✅ CRITICAL: Force backup after successful restoration
      forceSessionBackup(session);
      return true;
    }
    
    // LAYER 2: Try cookie backup
    const restored = await restoreSessionFromCookie();
    if (restored) {
      // Belt and suspenders: Also save to localStorage
      await supabase.auth.setSession(restored);
      return true;
    }
    
    // Retry if first attempt failed
    if (attempt === 1) {
      await sleep(1000);
      continue;
    }
  }
  
  return false; // Both layers + retries failed
};
```

### 4. Fixed useEffect Dependency Bug

**Original (PROBLEMATIC):**
```typescript
useEffect(() => {
  // ...refreshAuth logic
}, [currentUser]); // ❌ Re-registers every time user changes!
```

**Fixed:**
```typescript
useEffect(() => {
  // ...refreshAuth logic
}, []); // ✅ Register only once on mount
```

**Why This Matters**: 
- Re-registering on every `currentUser` change caused duplicate handlers
- Multiple handlers could interfere with each other
- Created race conditions during restoration

## How It Works Now

### Lifecycle of Multiple Tab Revisits

#### First Tab Revisit
1. User logs in → Session in localStorage + cookie ✅
2. Navigate away → Realtime disconnects
3. Return → `refreshAuth` called:
   - Finds session in localStorage ✅
   - **Forces backup to cookie** (new!)
   - Queries succeed ✅

#### Second Tab Revisit
4. Navigate away again → Realtime disconnects
5. `onAuthStateChange` fires with temporary `null` session
   - **Old behavior**: Cookie deleted ❌
   - **New behavior**: Cookie preserved (only delete on SIGNED_OUT) ✅
6. Return → `refreshAuth` called:
   - **Scenario A**: localStorage still has session → use it ✅
   - **Scenario B**: localStorage cleared → restore from cookie ✅
   - Both scenarios now force backup to cookie
   - Queries succeed ✅

#### Third+ Tab Revisits
7. Same robust flow continues indefinitely
8. Session persists until:
   - Actual user logout (SIGNED_OUT event)
   - Session expires (validated before use)
   - Browser clears ALL storage (rare)

## Key Improvements

### 1. Defensive Cookie Management
- Only delete on explicit `SIGNED_OUT`
- Validate expiry before saving
- Don't react to temporary null sessions

### 2. Forced Backup Strategy
- After EVERY successful restoration, force backup to cookie
- "Belt and suspenders" approach - save to both storages
- Increases resilience against storage clearing

### 3. Retry Mechanism
- 2 attempts with 1s delay between
- Handles transient failures
- Gives storage time to sync

### 4. Session Validation
- Check expiry before using/saving session
- Clean up expired sessions proactively
- Prevent using stale tokens

### 5. Single Registration
- Empty dependency array prevents re-registration
- Eliminates duplicate handler issues
- Cleaner lifecycle management

## Testing Instructions

### Test Scenario: Multiple Tab Switches

1. **Login** → Verify session saved
   ```
   Console: "💾 Session saved to cookie backup"
   ```

2. **Switch away 3 minutes** → Return
   ```
   Console: 
   "✅ UnifiedAuth v26.0 - Valid session found (from localStorage)"
   "💾 Forced session backup to cookie"
   ```

3. **Switch away 3 minutes again** → Return
   ```
   Console should show ONE of:
   - "✅ Valid session found (from localStorage)" + forced backup
   - "✅ Session restored from cookie backup!" + save to localStorage
   ```

4. **Repeat 5+ times** → All should succeed

### Success Criteria
- ✅ No "localStorage and cookies both empty" errors
- ✅ Queries succeed on ALL tab revisits
- ✅ Session persists across multiple switches
- ✅ Only fails on actual logout or expiry

### Expected Console Pattern
```
// Tab revisit 1
🔓 Tab visible again after Xs
🔁 Coordinating refresh (2 handlers registered)...
🔄 UnifiedAuth v26.0 - Coordinator-triggered session check
✅ UnifiedAuth v26.0 - Valid session found (from localStorage)
💾 Forced session backup to cookie
✅ Auth handler completed, session and user restored

// Tab revisit 2 (even if localStorage cleared)
🔓 Tab visible again after Xs
🔁 Coordinating refresh (2 handlers registered)...
🔄 UnifiedAuth v26.0 - Coordinator-triggered session check
⚠️ UnifiedAuth v26.0 - No session in localStorage, attempting cookie restore...
✅ UnifiedAuth v26.0 - Session restored from cookie backup!
✅ Auth handler completed, session and user restored

// Tab revisit 3+ (continuous success)
[Same pattern repeats successfully]
```

## Debugging

### Check Cookie Status
```javascript
document.cookie.split(';').find(c => c.includes('sb-auth-token'))
```

### Check localStorage
```javascript
localStorage.getItem('sb-ltjlswzrdgtoddyqmydo-auth-token')
```

### Force Session Backup
```javascript
// In browser console
const { forceSessionBackup } = await import('./integrations/supabase/client');
const { data } = await supabase.auth.getSession();
forceSessionBackup(data.session);
```

## Architecture

### Multi-Layer Defense

```
Layer 1: localStorage (Supabase native)
         ↓ (if fails)
Layer 2: Cookie backup
         ↓ (if fails)  
Layer 3: Retry attempt 1
         ↓ (if fails)
Layer 4: Retry attempt 2
         ↓ (if fails)
Graceful failure → User re-login required
```

### Forced Backup Strategy

```
Every successful restoration:
  ├─ Found in localStorage? → Force backup to cookie
  └─ Found in cookie? → Also save to localStorage
  
Result: Both storages always in sync after restoration
```

## Performance Impact

- **Minimal**: Cookie operations are synchronous and fast
- **Added delay**: 1s between retry attempts (only if needed)
- **Network**: No additional API calls
- **Storage**: ~2KB cookie size (standard session)

## Browser Compatibility

- ✅ All modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Supports SameSite=Lax cookies
- ✅ Works with strict cookie policies
- ⚠️ Requires cookies enabled (fallback to localStorage only)

## Future Enhancements

1. **Session Refresh**: Auto-refresh tokens before expiry
2. **Cross-Tab Sync**: Sync session across multiple tabs
3. **Secure Storage**: Encrypt sensitive session data
4. **Analytics**: Track restoration success rates
5. **Adaptive Retry**: Increase retry attempts based on failure patterns
