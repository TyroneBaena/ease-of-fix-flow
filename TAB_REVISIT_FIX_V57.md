# Tab Revisit Fix v57.0 - Null Session Detection & Fast Failure

## Critical Bug Found
**Session cookie not being sent to backend** - causing `{"session": null}` responses and infinite wait times.

## Root Cause
1. Session endpoint returns `null` when cookies aren't sent properly
2. Auth listener waits 10s for session that never arrives
3. Data fetches timeout after 60s with no data loaded
4. User sees empty state (0 properties, 0 requests)

## v57.0 Changes

### 1. Enhanced Cookie Detection (`sessionRehydration.ts`)
```typescript
// NEW: Check for cookies BEFORE making request
const hasAuthCookie = document.cookie.includes('sb-auth-session');
if (!hasAuthCookie) {
  console.warn("No auth cookie found, session likely expired");
  return false;
}
```

### 2. Null Session Detection
```typescript
// NEW: Explicit null check
if (!session || session === null) {
  console.error("Session is explicitly NULL - cookies not sent or expired");
  return false;
}
```

### 3. Fast Failure on Session Loss (`visibilityCoordinator.ts`)
```typescript
// CHANGED: Fail fast on FIRST failure (was 2 failures)
if (this.consecutiveFailures >= 1) {
  console.error("Session expired - immediate redirect");
  toast.error("Your session has expired. Redirecting...");
  this.notifyError('SESSION_EXPIRED');
  setTimeout(() => window.location.href = '/login', 1500);
}
```

### 4. Reduced Auth Listener Timeout
```typescript
// CHANGED: 5 seconds max (was 10s)
const maxAttempts = 50; // 5s instead of 10s
```

### 5. Added Cache Prevention
```typescript
headers: { 
  "Accept": "application/json",
  "Cache-Control": "no-cache", // NEW: Prevent stale responses
}
```

## Expected Behavior

### On Login:
1. ✅ Cookies set immediately
2. ✅ Session validated
3. ✅ Data loads within 2-3 seconds
4. ✅ Dashboard shows properties and requests

### On Tab Revisit (Quick):
1. ✅ Cookies still present
2. ✅ Session restored in <1s
3. ✅ Data refreshes in <2s
4. ✅ No loading state flash

### On Tab Revisit (After Time):
1. ✅ Cookies checked first
2. ✅ If expired: Immediate redirect to login
3. ✅ If valid: Full restore in <5s
4. ✅ Data loads within 3s

### On Session Expired:
1. ✅ Detected in <1s (not 70s)
2. ✅ Toast: "Session expired. Redirecting..."
3. ✅ Redirect to login in 1.5s
4. ❌ No hanging or empty states

## Testing Checklist

- [ ] **Login Fresh**: Data loads immediately (2-3s)
- [ ] **Tab Hide/Show Quick**: No loading flash, data refreshes
- [ ] **Tab Hide 5min**: Data refreshes on return
- [ ] **Multiple Tab Switches**: No timeouts, smooth transitions
- [ ] **Expired Session**: Immediate detection and redirect
- [ ] **No Cookies**: Fast failure, no 70s wait

## Debugging

If data still doesn't load:

1. **Check Cookies**: Open DevTools → Application → Cookies → Look for `sb-auth-session`
2. **Check Console**: Look for "v57.0" logs showing cookie detection
3. **Check Network**: `/session` endpoint should return `{"session": {...}}` not `null`
4. **Check RLS**: Run `SELECT COUNT(*) FROM maintenance_requests WHERE organization_id IS NOT NULL`

## Key Metrics

- Cookie detection: <100ms
- Session fetch: <1s
- Auth listener ready: <2s
- Data fetch: <3s
- **Total tab revisit: <5s** (was >70s on failure)
