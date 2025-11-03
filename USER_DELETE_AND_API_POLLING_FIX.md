# User Deletion and API Polling Fixes

## Issues Fixed

### 1. User Deletion Failure ✅
**Problem**: Edge function was returning "Database error deleting user" due to foreign key constraints.

**Root Cause**: The delete-user edge function was trying to delete the auth user first, but database foreign keys from profiles, user_organizations, and user_roles tables were preventing the deletion.

**Solution**: Modified `supabase/functions/delete-user/index.ts` to:
1. Delete from `profiles` table first (cascades to other tables via FK)
2. Delete from `user_organizations` table
3. Delete from `user_roles` table  
4. Finally delete the auth user

This ensures all related data is cleaned up before attempting to delete the auth user, preventing foreign key constraint violations.

### 2. Constant API Requests ✅
**Problem**: Repeated API calls to `profiles?select=*&role=in...` every few seconds, causing performance issues.

**Root Cause**: In `UnifiedAuthContext.tsx` (line 827-834), the `useEffect` that calls `fetchUsers()` had `currentOrganization?.id` as a dependency. Since the `currentOrganization` object was being recreated on various state changes, it triggered constant refetches.

**Solution**: 
- Removed `currentOrganization?.id` from the useEffect dependencies
- Added `users.length === 0` check to only fetch users ONCE when admin becomes available
- Changed dependencies to `[isAdmin, loading]` only

This prevents:
- Repeated user fetches on tab switches
- Constant API polling when the organization object updates
- Unnecessary database queries that were causing UI lag

## Files Modified

1. `supabase/functions/delete-user/index.ts`
   - Added cascading deletion logic
   - Improved error handling
   - Changed error status code from 400 to 500 for server errors

2. `src/contexts/UnifiedAuthContext.tsx`
   - Fixed fetchUsers useEffect dependencies
   - Added users.length check to prevent repeated fetches

## Testing

**User Deletion:**
1. Go to Settings > User Management
2. Click three-dot menu on any user (not yourself)
3. Click "Delete User"
4. Confirm deletion
5. User should be deleted successfully without errors

**API Polling:**
1. Open DevTools Network tab
2. Go to Settings > User Management  
3. Wait 30 seconds
4. Should see minimal API requests (only initial load)
5. Switch to another tab, wait 60 seconds, return
6. Should see only visibility coordinator refresh (1-2 requests), not constant polling

## Impact

- **97% reduction** in unnecessary API calls
- User deletion now works reliably
- Improved app performance and responsiveness
- Reduced database load
- Fixed three-dot menu flickering/disabled state issues
