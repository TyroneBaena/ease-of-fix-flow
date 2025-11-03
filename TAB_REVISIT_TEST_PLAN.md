# Tab Revisit Workflow - Comprehensive Test Plan

## Overview
This document outlines the complete test plan for the tab revisit workflow to ensure seamless user experience when switching between tabs.

## Key Improvements Made

### 1. Visibility Coordinator v4.0
- ✅ **Prevents duplicate handler registrations** - Preserves lastFetchTime when re-registering
- ✅ **Minimum hidden time filter** - Only refreshes if tab was hidden for >5 seconds
- ✅ **Increased stagger delays** - 300ms first, 800ms subsequent to prevent database congestion
- ✅ **Truly non-blocking refreshes** - Uses Promise.resolve() to prevent blocking

### 2. Auth Context v19.0
- ✅ **Smart session comparison** - Only updates state if access_token actually changed
- ✅ **Increased stale threshold** - 90 seconds (from 60s) to reduce frequency
- ✅ **Removed unnecessary session updates** - Supabase handles tokens automatically

### 3. Route Guards
- ✅ **ProtectedRoute** - Tracks initial load, never shows loading on tab switches
- ✅ **OrganizationGuard** - Tracks initial load, never shows loading on tab switches
- ✅ **AdminRouteGuard** - Tracks initial load, never shows loading on tab switches
- ✅ **ContractorRouteGuard** - Tracks initial load, never shows loading on tab switches

### 4. Pages
- ✅ **Settings Page** - Uses hasLoadedOnce pattern
- ✅ **Dashboard Page** - No forced refresh on mount

## Test Scenarios

### Scenario 1: Quick Tab Switches (<5 seconds)
**Steps:**
1. Load the Dashboard page
2. Switch to another browser tab
3. Wait 3 seconds
4. Switch back to the app tab

**Expected Result:**
- ✅ No loading spinner
- ✅ No API calls (coordinator skips refresh for <5s)
- ✅ UI renders immediately with existing data
- ✅ Console shows: "Tab switch too quick (<5s), skipping refresh"

### Scenario 2: Medium Tab Switches (5-30 seconds)
**Steps:**
1. Load the Dashboard page
2. Switch to another browser tab
3. Wait 15 seconds
4. Switch back to the app tab

**Expected Result:**
- ✅ No loading spinner
- ✅ UI renders immediately with existing data
- ✅ Background refresh of stale data only (auth is still fresh at 90s threshold)
- ✅ Data providers refresh silently if their threshold exceeded

### Scenario 3: Long Tab Switches (>90 seconds)
**Steps:**
1. Load the Dashboard page
2. Switch to another browser tab
3. Wait 2 minutes
4. Switch back to the app tab

**Expected Result:**
- ✅ No loading spinner
- ✅ UI renders immediately with existing data
- ✅ Auth + all data providers refresh in background with staggered delays
- ✅ Console shows: "Refreshing X stale handlers in background"
- ✅ User sees existing data immediately, then smooth updates as fresh data arrives

### Scenario 4: Multiple Rapid Tab Switches
**Steps:**
1. Load the Dashboard page
2. Switch away for 3 seconds, then back
3. Switch away for 2 seconds, then back
4. Switch away for 4 seconds, then back
5. Switch away for 10 seconds, then back

**Expected Result:**
- ✅ No loading spinners at any point
- ✅ First three switches: No refresh (all <5s)
- ✅ Fourth switch: Background refresh of stale data
- ✅ No duplicate handlers registered
- ✅ Performance remains smooth

### Scenario 5: Navigation Between Pages with Tab Switches
**Steps:**
1. Load Dashboard page
2. Navigate to Settings page
3. Switch to another browser tab for 20 seconds
4. Switch back to the app tab
5. Navigate to Maintenance Requests page
6. Switch to another browser tab for 30 seconds
7. Switch back to the app tab

**Expected Result:**
- ✅ No loading spinners on any page
- ✅ Each guard only shows loading on first visit
- ✅ Subsequent visits (including after tab switches) render immediately
- ✅ Data refreshes happen in background

### Scenario 6: New Request Page Tab Switch
**Steps:**
1. Navigate to /new-request page
2. Start filling out the form
3. Switch to another browser tab for 15 seconds
4. Switch back to the app tab

**Expected Result:**
- ✅ Form data preserved (not cleared)
- ✅ No loading spinner
- ✅ Page renders immediately
- ✅ User can continue filling out the form

### Scenario 7: Contractor Dashboard Tab Switch
**Steps:**
1. Login as contractor user
2. Load Contractor Dashboard
3. Switch to another browser tab for 40 seconds
4. Switch back to the app tab

**Expected Result:**
- ✅ No loading spinner
- ✅ Dashboard renders immediately
- ✅ Contractor data refreshes in background
- ✅ No contractor profile re-check on tab switch

## Performance Metrics

### Expected Console Log Pattern
```
👁️ VisibilityCoordinator v4.0 - Tab hidden
👁️ VisibilityCoordinator v4.0 - Tab visible after 15 s
👁️ VisibilityCoordinator v4.0 - Checking for stale data
🔄 VisibilityCoordinator v4.0 - auth: 95s old, threshold: 90s, STALE - refreshing
🔄 VisibilityCoordinator v4.0 - contractors: 45s old, threshold: 30s, STALE - refreshing
🔄 VisibilityCoordinator v4.0 - maintenance_requests: 20s old, threshold: 30s, FRESH - skipping
🔄 VisibilityCoordinator v4.0 - Refreshing 2 stale handlers in background
🔄 VisibilityCoordinator v4.0 - Starting background refresh: auth (priority 1)
🔄 UnifiedAuth v19.0 - Coordinator-triggered session check
🔄 UnifiedAuth v19.0 - Session valid, no changes needed
[After 300ms delay]
🔄 VisibilityCoordinator v4.0 - Starting background refresh: contractors (priority 4)
```

### API Request Limits
- **Auth checks**: Max once per 90 seconds during tab visibility
- **Data provider refreshes**: Only when actually stale
- **NO excessive polling**: No requests should happen every 2 seconds
- **Staggered execution**: 300ms + 800ms delays between refreshes

## Debugging Tools

### Check Coordinator State
```javascript
// In browser console:
window.visibilityCoordinatorState = () => {
  console.log('Coordinator State:', visibilityCoordinator.getState());
};
```

### Force Manual Refresh
```javascript
// In browser console:
window.forceRefresh = async () => {
  await visibilityCoordinator.manualRefresh();
};
```

## Known Limitations

1. **Auth-protected screenshots**: Screenshot tool cannot access auth-protected pages
2. **Session state**: User's actual session persists even when screenshot tool shows login
3. **First load**: Initial page load will show loading spinner (expected behavior)
4. **Tab visibility API**: Requires modern browser support (works in all major browsers)

## Success Criteria

✅ **Zero visible loading spinners** after initial page load, regardless of tab switches
✅ **Immediate UI rendering** with existing data on every tab revisit
✅ **Smart background refresh** of only stale data
✅ **No excessive API calls** (auth checks limited to 90s threshold)
✅ **Smooth user experience** with no interruptions or flashes
✅ **Form data preservation** when switching tabs mid-form
✅ **Database efficiency** with staggered queries
✅ **No duplicate handler registrations** when components remount

## Regression Prevention

### Before Deployment Checklist
- [ ] Test all 7 scenarios above
- [ ] Verify no loading spinners on tab switches
- [ ] Check browser console for excessive /user requests
- [ ] Verify coordinator logs show proper stale/fresh detection
- [ ] Test with slow network (throttle to 3G in DevTools)
- [ ] Test with multiple properties and requests (heavy data load)
- [ ] Test contractor and admin roles separately

### Monitoring in Production
- Monitor auth request frequency (should not exceed 1 per 90s per user)
- Track visibility change events and refresh patterns
- Watch for user reports of "loading" or "flashing" behavior
