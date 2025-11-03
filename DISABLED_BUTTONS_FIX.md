# Disabled Action Buttons on Tab Revisit - Fix

## Issue

After revisiting the project tab, action buttons (three-dot menus) in User Management table became disabled, preventing user interactions.

## Root Cause

The `isLoading` state from `useUserManagement` was being set to `true` during background data refreshes triggered by the visibility coordinator. This loading state was passed down to `UserTableRow`, which disabled all action buttons when `isLoading={true}`.

### Flow of the Problem

```
Tab revisit (after 30s)
    ↓
Visibility coordinator detects stale data
    ↓
Triggers fetchUsers() in background
    ↓
useUserManagement sets isLoadingUsers = true
    ↓
isLoading = (isLoading || isLoadingUsers || !ready) && isAdmin
    ↓
isLoading = true passed to UserTable
    ↓
Passed to UserTableRow
    ↓
<Button disabled={isLoading}> ❌ All buttons disabled
```

## Solution

Modified `useUserManagement.tsx` to differentiate between **initial loading** and **background refresh loading**:

```typescript
// BEFORE (Line 154):
isLoading: (isLoading || isLoadingUsers || !ready) && isAdmin,

// AFTER (Line 156):
isLoading: (isLoading || (!fetchedOnce && isLoadingUsers) || !ready) && isAdmin,
```

### Key Change

```typescript
(!fetchedOnce && isLoadingUsers)
```

This condition ensures that:
- **Initial Load**: `fetchedOnce = false` → Show loading state, disable buttons ✅
- **Background Refresh**: `fetchedOnce = true` → Don't show loading, keep buttons enabled ✅

## Additional Fixes

### 1. Reduced Profile Query Timeout
**File:** `src/contexts/UnifiedAuthContext.tsx` (Line 158)

**Change:**
```typescript
// Before: 15 seconds
setTimeout(() => { ... }, 15000);

// After: 5 seconds
setTimeout(() => { ... }, 5000);
```

**Reason:** 15-second timeout was causing the "Profile query timed out" warning and delaying app rendering. 5 seconds is sufficient for profile queries and provides faster fallback.

### 2. Reduced AppRoutes Failsafe Timer
**File:** `src/App.tsx` (Line 79)

**Change:**
```typescript
// Before: 15 seconds
setTimeout(() => { ... }, 15000);

// After: 8 seconds
setTimeout(() => { ... }, 8000);
```

**Reason:** Faster recovery if auth initialization stalls, while still allowing time for coordinator refreshes.

## Testing

### Test Case 1: Initial Load
**Expected:** Buttons should be disabled while loading users
**Result:** ✅ Buttons disabled, then enabled when loaded

### Test Case 2: Background Refresh
**Steps:**
1. Navigate to User Management
2. Switch to another tab
3. Wait 35 seconds (triggers data refresh)
4. Switch back

**Expected:** 
- Action buttons remain enabled during background refresh
- Users can click buttons immediately
- No visual indication of loading in action column

**Result:** ✅ Buttons stay enabled, fully functional

### Test Case 3: User Actions
**Expected:** Buttons should be disabled during actual user actions (save, delete, reset)
**Result:** ✅ Buttons disabled only during active operations

## Files Modified

1. **src/components/settings/user-management/useUserManagement.tsx**
   - Line 156: Changed loading condition to exclude background refreshes

2. **src/contexts/UnifiedAuthContext.tsx**
   - Line 158: Reduced profile query timeout to 5s

3. **src/App.tsx**
   - Line 79: Reduced failsafe timer to 8s

## Impact

- **Action Buttons:** Always enabled after initial load, even during background refreshes
- **User Experience:** No interruption when revisiting tab
- **Performance:** Faster profile fallback (5s vs 15s)
- **Reliability:** Faster failsafe recovery (8s vs 15s)

## Related Fixes

This fix complements the previous tab revisit workflow improvements:
- React Query configuration (no aggressive refetching)
- Auth refresh logic (no false logouts)
- Callback memoization (no flickering)
- Visibility coordinator (smart background refreshes)

## Status

✅ **RESOLVED** - Action buttons remain enabled during background refreshes
✅ **TESTED** - Verified with tab revisit scenarios
✅ **PRODUCTION READY** - No breaking changes
