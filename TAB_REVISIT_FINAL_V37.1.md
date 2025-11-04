# Tab Revisit Fix v37.1 - Timeout Mismatch Resolution

## Problem After v37.0

User conversion was timing out, causing the auth handler to fail:

```
❌ UnifiedAuth v37.0 - User conversion failed: Error: User conversion timeout
❌ Auth handler timeout after 18s
❌ Auth handler failed after 3016ms - session restoration unsuccessful
```

**Root Cause**: Timeout mismatch in the restoration flow:
- `convertSupabaseUser()` has a profile query with a 5-second timeout
- But in `refreshAuth()`, we wrapped it with only a 3-second timeout
- This caused the conversion to **always timeout** before the profile query could complete
- Additionally, the cumulative timeouts (4s + 6s + 6s + 3s = 19s) exceeded the auth handler timeout of 18s

## The Timeout Chain Issue

```
getSession timeout:          4s
↓
backup restoration timeout:  6s
↓
refresh session timeout:     6s
↓
user conversion timeout:     3s (TOO SHORT!)
↓
Total worst case:           19s (EXCEEDS 18s auth handler timeout!)
```

## Solution: v37.1 Timeout Rebalancing

### 1. Increased User Conversion Timeout
**File**: `src/contexts/UnifiedAuthContext.tsx` (line 795)

```typescript
// Before v37.1
const convertedUser = await withTimeout(
  convertSupabaseUser(clientSession.user),
  3000, // Too short!
  'User conversion timeout'
);

// After v37.1
const convertedUser = await withTimeout(
  convertSupabaseUser(clientSession.user),
  8000, // Increased to 8s (profile query has 5s timeout + buffer)
  'User conversion timeout'
);
```

**Impact**: User conversion now has enough time to complete the profile query (5s) plus a 3s buffer.

### 2. Increased Auth Handler Timeout
**File**: `src/utils/visibilityCoordinator.ts` (line 175)

```typescript
// Before v37.1
setTimeout(() => {
  console.error("❌ Auth handler timeout after 18s");
  resolve(false);
}, 18000);

// After v37.1
setTimeout(() => {
  console.error("❌ Auth handler timeout after 25s");
  resolve(false);
}, 25000);
```

**New worst case timeline**:
```
getSession:          4s
backup restoration:  6s
refresh session:     6s
user conversion:     8s
Total:              24s (now within 25s auth handler timeout)
```

### 3. Increased Coordinator Timeout
**File**: `src/utils/visibilityCoordinator.ts` (line 163)

```typescript
// Before v37.1
const refreshTimeout = setTimeout(() => {
  console.error("❌ Coordinator timeout after 22s - force resetting");
  this.isRefreshing = false;
}, 22000);

// After v37.1
const refreshTimeout = setTimeout(() => {
  console.error("❌ Coordinator timeout after 28s - force resetting");
  this.isRefreshing = false;
}, 28000);
```

**Impact**: Coordinator timeout (28s) now provides a 3-second buffer beyond the auth handler timeout (25s).

## New Timeout Hierarchy (v37.1)

```
Level 1: Operation Timeouts
  - getSession:              4s
  - backup restoration:      6s
  - refresh session:         6s
  - user conversion:         8s

Level 2: Auth Handler Timeout
  - Total:                  25s (covers 24s worst case)

Level 3: Coordinator Timeout
  - Total:                  28s (3s buffer beyond auth handler)

Level 4: Stuck Flag Reset
  - Total:                  30s (unchanged, final safety net)
```

## Expected Console Output

### Successful Tab Revisit
```
🔓 Tab visible again after 25.5s
🔁 Coordinating refresh (2 handlers registered)...
🔄 UnifiedAuth v37.0 - Coordinator-triggered session restoration START
📡 Step 1: Checking Supabase client session...
✅ UnifiedAuth v37.0 - Valid session confirmed, converting user...
✅ UnifiedAuth v37.0 - Restoration complete in 1200ms
✅ Auth handler completed in 1200ms, session and user restored
✅ Final propagation complete, ready for data queries
✅ Coordinator refresh cycle complete in 2300ms
```

### With Backup Restoration
```
🔓 Tab visible again after 65.2s
🔁 Coordinating refresh (2 handlers registered)...
📡 Step 1: Checking Supabase client session...
⚠️ UnifiedAuth v37.0 - getSession timed out, proceeding to backup
📦 Step 2: No client session, attempting backup restoration...
✅ UnifiedAuth v37.0 - Session restored from backup
✅ UnifiedAuth v37.0 - Restored session verified in client
✅ UnifiedAuth v37.0 - Valid session confirmed, converting user...
✅ UnifiedAuth v37.0 - Restoration complete in 8500ms
✅ Auth handler completed in 8500ms, session and user restored
✅ Coordinator refresh cycle complete in 9600ms
```

## Testing Scenarios

### Test 1: Second Revisit After Long Duration (The Reported Issue)
1. Login to app
2. Hide tab for 90 seconds
3. Show tab (1st revisit) - should work
4. Wait 10 seconds
5. Hide tab for 90 seconds
6. Show tab (2nd revisit) - **should now work** ✅
7. ✅ Expected: No timeout errors, queries succeed

### Test 2: Multiple Long Revisits
1. Login to app
2. Repeat 5 times:
   - Hide tab for 2-5 minutes
   - Show tab
   - Verify queries work
3. ✅ Expected: All revisits successful

### Test 3: Stress Test
1. Login to app
2. Perform 10+ tab revisits with mixed durations (10s to 5 minutes)
3. ✅ Expected: No failures, all queries succeed

## Why This Fixes The Issue

1. **Timeout Alignment**: User conversion timeout (8s) now exceeds profile query timeout (5s)
2. **Buffer Margins**: Each level has sufficient buffer for the level below
3. **Worst Case Coverage**: Auth handler timeout (25s) covers worst case (24s) with 1s margin
4. **Safety Nets**: Coordinator (28s) and stuck flag reset (30s) provide additional protection
5. **Proactive Monitoring**: v37.0's keepalive and periodic backup still active

## Changes Made

### Modified Files
1. **src/contexts/UnifiedAuthContext.tsx**
   - Line 795: Increased user conversion timeout from 3s to 8s
   
2. **src/utils/visibilityCoordinator.ts**
   - Line 163: Increased coordinator timeout from 22s to 28s
   - Line 175: Increased auth handler timeout from 18s to 25s

## Result

The timeout mismatch is now resolved. User conversion has enough time to complete, and the cumulative timeouts are properly aligned with buffer margins at each level. Combined with v37.0's proactive session monitoring, tab revisits should now work reliably for unlimited revisits.
