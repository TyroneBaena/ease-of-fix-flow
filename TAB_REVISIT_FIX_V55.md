# Tab Revisit v55.0 - CRITICAL FIX: Session Ready Callback with Current Auth State

## Root Cause Fixed
**The session ready callback was using STALE closures** - when `TabVisibilityContext` registered the callback with `visibilityCoordinator`, it captured the initial auth state values. Even after the user logged in and `isSessionReady` became true, the callback was still checking the old captured values from initial render.

## Bugs Fixed in v55.0

### 1. ✅ Properties Don't Load on Login
- **Problem**: Session ready callback used stale `isSessionReady=false` from initial render
- **Fix**: Used refs to store CURRENT auth state, callback reads from refs instead of closures
- **Result**: Properties now load immediately after login

### 2. ✅ Tab Revisit Timeout After Multiple Visits  
- **Problem**: Data fetch callbacks captured stale auth values at registration time
- **Fix**: All provider callbacks now use refs to access CURRENT auth state
- **Result**: No more 20-second timeouts on multiple tab revisits

### 3. ✅ Handler Accumulation (from v54.0)
- **Already Fixed**: Handlers properly removed from both pending and active arrays
- **Result**: No duplicate queries building up over time

## Technical Changes

### TabVisibilityContext.tsx
```typescript
// Store current auth state in ref
const authStateRef = useRef({ isSessionReady, currentUser });

// Update ref on every auth change
useEffect(() => {
  authStateRef.current = { isSessionReady, currentUser };
}, [isSessionReady, currentUser]);

// Callback reads CURRENT values from ref
visibilityCoordinator.setSessionReadyCallback(() => {
  const current = authStateRef.current;
  return current.isSessionReady && !!current.currentUser?.id;
});
```

### All Data Providers (Property, Maintenance, Contractor)
```typescript
// Store current auth state in ref
const authStateRef = useRef({ isSessionReady, currentUser });

// Callback accesses CURRENT values via ref
const fetchData = useCallback(async () => {
  const { isSessionReady, currentUser } = authStateRef.current;
  // Uses fresh values, not stale closure values
}, []); // Empty deps - stable callback
```

## Testing Checklist

✅ Login → Properties load immediately  
✅ Tab hide 10s → show → Properties load  
✅ Multiple rapid tab switches → No accumulation  
✅ Tab revisit 5+ times → No timeout  
✅ Login → Hide tab → Show tab → Data refreshes  

## Key Insight

React closures capture values at creation time. For callbacks that need to access CURRENT state (not state from when callback was created), use refs to store the latest values and read from refs inside the callback.
