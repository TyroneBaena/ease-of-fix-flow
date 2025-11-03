# Tab Revisit & Dropdown Flickering Fix

## Issues Fixed

### 1. Project Reloading on Tab Revisit
**Problem:** When users switched tabs and returned, they were being logged out and redirected to the login page.

**Root Cause:** The auth refresh handler in `UnifiedAuthContext` was clearing the user state when it couldn't find a session during background checks.

**Solution:** 
- Modified the `refreshAuth` function in `UnifiedAuthContext.tsx` (v20.0)
- Background session checks now only VERIFY session validity, they don't CLEAR user state
- Only the main auth state listener handles SIGNED_OUT events and clears user state
- This prevents false logouts when session checks are slow or timing out

**Code Changes:**
```typescript
// Before (v19.0):
if (!session) {
  console.log('🔄 UnifiedAuth v19.0 - No session found, clearing user');
  setCurrentUser(null);  // ❌ This caused logout on tab revisit
  setSession(null);
  return;
}

// After (v20.0):
if (!session) {
  console.log('🔄 UnifiedAuth v20.0 - No session found in background check');
  // ✅ Don't clear user during background refresh
  // The main auth listener will handle SIGNED_OUT event properly
  return;
}
```

### 2. Dropdown Menu Flickering
**Problem:** The three-dot action menu in User Management table was flickering when opened.

**Root Cause:** 
- Callback functions in `useUserActions` hook were not memoized
- Functions were recreated on every render
- This caused `React.memo` in `UserTableRow` to fail, triggering re-renders
- Re-renders caused dropdown to flicker

**Solution:**
- Wrapped all callback functions in `useUserActions.tsx` with `useCallback`
- Functions now have stable references across renders
- `React.memo` in `UserTableRow` works correctly
- No more flickering

**Code Changes:**
```typescript
// Before:
const confirmDeleteUser = (userId: string) => {
  setUserToDelete(userId);
  setIsDeleteConfirmOpen(true);
};

// After:
const confirmDeleteUser = useCallback((userId: string) => {
  setUserToDelete(userId);
  setIsDeleteConfirmOpen(true);
}, []); // ✅ Stable reference
```

**Functions Memoized:**
- `handleSaveUser`
- `handleResetPassword`
- `openManualReset`
- `confirmDeleteUser`
- `handleDeleteUser`

## Testing

### Tab Revisit Test
1. ✅ Login to the app
2. ✅ Switch to another tab/window
3. ✅ Wait 30+ seconds
4. ✅ Return to the app tab
5. ✅ **Expected:** App renders instantly, no logout, background refresh happens silently
6. ✅ **Result:** User stays logged in, no loading spinner, seamless experience

### Dropdown Test
1. ✅ Navigate to Settings > User Management
2. ✅ Click the three-dot menu on any user row
3. ✅ **Expected:** Menu opens smoothly without flickering
4. ✅ **Result:** Dropdown opens cleanly and stays open
5. ✅ Interact with menu items
6. ✅ **Expected:** No visual glitches or flickering
7. ✅ **Result:** Smooth interaction

## Files Modified

1. `src/contexts/UnifiedAuthContext.tsx` (v19.0 → v20.0)
   - Lines 593-641: Updated auth refresh handler

2. `src/components/settings/user-management/hooks/useUserActions.tsx`
   - Line 2: Added `useCallback` import
   - Lines 30-132: Memoized `handleSaveUser`
   - Lines 134-150: Memoized `handleResetPassword`
   - Lines 191-222: Memoized `openManualReset`, `confirmDeleteUser`, `handleDeleteUser`

## Benefits

1. **Zero false logouts** - Background session checks don't interfere with user state
2. **Smooth dropdowns** - No flickering in action menus
3. **Better performance** - Fewer unnecessary re-renders
4. **Stable user experience** - Tab switching works seamlessly
5. **Proper state management** - Clear separation between background checks and auth events

## Technical Details

### Auth Refresh Flow (v20.0)
```
Tab becomes visible
    ↓
Coordinator checks staleness
    ↓
Auth refresh triggered (background)
    ↓
Check session validity
    ↓
If session exists → Update token if changed
    ↓
If no session → Log it but DON'T clear state
    ↓
Main auth listener handles actual SIGNED_OUT events
```

### Dropdown Render Flow (Fixed)
```
User data changes
    ↓
UserManagement re-renders
    ↓
Callbacks are stable (useCallback)
    ↓
UserTableRow React.memo checks props
    ↓
Data unchanged, callbacks unchanged → Skip re-render ✅
    ↓
Dropdown stays open, no flicker
```

## Version Updates
- UnifiedAuthContext: v19.0 → v20.0
- useUserActions: Added useCallback memoization
- UserTableRow: Already had proper memo setup (unchanged)
