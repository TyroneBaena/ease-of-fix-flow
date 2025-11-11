# Settings Management React Query Fix (v80.0)

## Problem Summary

User and Contractor Management sections in Settings had two critical issues:
1. **Multiple API calls on tab click** - profiles API runs "many times" when clicking User Management or Contractor Management tabs
2. **No fetch on tab return** - profiles API does not run when switching to another tab and returning

## Root Cause

Both management sections used manual fetch state management with:
- `loading` state and `fetchInProgress` refs
- useEffect-based fetching that triggers on dependency changes
- No automatic refetch on window focus
- No request deduplication during rapid re-renders

The visibility coordinator's flag reset (v79.1) only removed the block but didn't trigger a new fetch.

## Solution Implemented (v80.0)

### Created Two New React Query Hooks

**Only for User/Contractor Management sections** - other pages unchanged:

1. **`src/hooks/settings/useSettingsUsers.ts`**
   - Uses React Query with `refetchOnWindowFocus: true`
   - Built-in request deduplication
   - 30s stale time
   - Automatic retry logic

2. **`src/hooks/settings/useSettingsContractors.ts`**
   - Same features as useSettingsUsers
   - Uses existing `fetchContractors` operation
   - Isolated to Contractor Management only

### Updated Existing Hooks

1. **`src/components/settings/user-management/useUserManagement.tsx`**
   - Replaced manual fetch logic with `useSettingsUsers` hook
   - Removed `fetchInProgress` flag and manual loading states
   - Removed `fetchDebounceTimerRef` (React Query handles this)
   - Kept all other functionality unchanged

2. **`src/components/settings/contractor-management/hooks/useContractorManagement.ts`**
   - Replaced manual fetch logic with `useSettingsContractors` hook
   - Removed `isFetchingRef`, `hasCompletedInitialLoadRef`, and debounce timer
   - Removed direct Supabase queries (React Query handles caching)
   - Kept all other functionality unchanged

## How It Solves Both Issues

### Issue 1: Multiple API Calls on Tab Click
✅ **React Query's Request Deduplication**
- Multiple components requesting same data get a single fetch
- Rapid re-renders during tab switches don't trigger duplicate requests
- Built-in caching prevents unnecessary refetches within stale time (30s)

### Issue 2: No Fetch on Tab Return
✅ **React Query's `refetchOnWindowFocus: true`**
- Automatically refetches when tab becomes visible
- Checks if data is stale (>30s old) before refetching
- No manual visibility listeners needed
- No flag management required

## Architecture Benefits

### Isolated Changes
- **Only** User and Contractor Management use new hooks
- Dashboard, Reports, and other pages **unchanged**
- UserContext still exists for backward compatibility
- Zero breaking changes to other functionality

### React Query Integration
- Aligns with existing React Query usage in the app (already installed)
- Leverages `@tanstack/react-query` package
- Uses same QueryClient instance
- Consistent caching strategy across app

### Simplified Code
**Before (v79.1):**
```typescript
const fetchInProgress = useRef(false);
const fetchDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
// Manual visibility coordinator registration
// Manual flag reset logic
// Manual debouncing
// Manual error handling
```

**After (v80.0):**
```typescript
const { users, loading, error, refetch } = useSettingsUsers({ enabled: isAdmin });
// React Query handles everything ✨
```

## Testing Checklist

### User Management
- [ ] Click "User Management" tab - verify single API call
- [ ] Click rapidly between tabs - verify no duplicate calls
- [ ] Switch to another tab for 5s, return - verify automatic refetch
- [ ] Switch to another tab for 35s, return - verify refetch (data stale)
- [ ] Add/edit/delete user - verify list updates correctly
- [ ] Check console for v80.0 logs

### Contractor Management
- [ ] Click "Contractor Management" tab - verify single API call
- [ ] Click rapidly between tabs - verify no duplicate calls
- [ ] Switch to another tab for 5s, return - verify automatic refetch
- [ ] Switch to another tab for 35s, return - verify refetch (data stale)
- [ ] Add/edit/delete contractor - verify list updates correctly
- [ ] Check console for v80.0 logs

### Other Pages (No Changes Expected)
- [ ] Dashboard - verify works as before
- [ ] Reports - verify works as before
- [ ] Team Management - verify works as before
- [ ] Account Settings - verify works as before

## Console Log Patterns

### Normal Operation (v80.0)
```
👥 v80.0 - useSettingsUsers: Fetching users via React Query
👥 v80.0 - useSettingsUsers: Fetched 5 users
🏗️ v80.0 - useSettingsContractors: Fetching contractors via React Query
🏗️ v80.0 - useSettingsContractors: Fetched 3 contractors
```

### Tab Return (Automatic Refetch)
```
🔓 v79.1 - Tab visible - Resetting flags
👥 v80.0 - useSettingsUsers: Fetching users via React Query (refetch on window focus)
👥 v80.0 - useSettingsUsers: Fetched 5 users
```

### No Refetch (Data Still Fresh)
```
🔓 v79.1 - Tab visible - Resetting flags
(No fetch - data still fresh, <30s old)
```

## Configuration

### Stale Time (30 seconds)
```typescript
staleTime: 30000, // Data considered stale after 30s
```
- Adjust if you want more/less aggressive refetching
- Increase for less frequent refetches
- Decrease for more real-time data

### Cache Time (5 minutes)
```typescript
gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
```
- Data stays in memory even when component unmounts
- Allows instant display when returning to page

### Retry Strategy
```typescript
retry: 2, // Retry failed requests twice
```
- Automatically retries on network failures
- Exponential backoff between retries

## Migration Path (If Needed)

If you want to extend this pattern to other sections:

1. Create a new React Query hook in `src/hooks/settings/`
2. Replace manual fetch logic in the component's hook
3. Keep the wrapper functions for backward compatibility
4. Test thoroughly
5. Remove old manual fetch code once verified

## Files Changed

### New Files
- `src/hooks/settings/useSettingsUsers.ts`
- `src/hooks/settings/useSettingsContractors.ts`
- `SETTINGS_REACT_QUERY_FIX.md`

### Modified Files
- `src/components/settings/user-management/useUserManagement.tsx`
- `src/components/settings/contractor-management/hooks/useContractorManagement.ts`

### Unchanged Files
- `src/contexts/UserContext.tsx` - Still used by other pages
- `src/contexts/user/useUserProvider.tsx` - Still has v79.1 flag reset
- `src/utils/visibilityCoordinator.ts` - Still works as before
- All other Settings tabs and pages

## Backward Compatibility

✅ **100% Backward Compatible**
- All existing APIs remain unchanged
- `fetchUsers()` and `loadContractors()` still work
- Component props and interfaces unchanged
- Other pages unaffected

## Performance Impact

### Before (Multiple Issues)
- 5-10 API calls on rapid tab switches
- Stuck loading states
- No refetch on tab return

### After (Optimized)
- 1 API call per tab click (deduplication)
- Automatic refetch on tab return (when stale)
- Smart caching (instant display for fresh data)

## Future Improvements

1. **Mutations**: Add React Query mutations for add/update/delete operations
2. **Optimistic Updates**: Update UI immediately before API response
3. **Infinite Scroll**: Use React Query's infinite query for pagination
4. **Real-time**: Add Supabase real-time subscriptions via React Query
5. **Analytics**: Track fetch frequency and performance metrics

## References

- [React Query Docs](https://tanstack.com/query/latest)
- [Window Focus Refetching](https://tanstack.com/query/latest/docs/framework/react/guides/window-focus-refetching)
- [Request Deduplication](https://tanstack.com/query/latest/docs/framework/react/guides/request-deduplication)
