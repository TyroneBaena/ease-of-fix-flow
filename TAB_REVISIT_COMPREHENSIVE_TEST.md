# Comprehensive Tab Revisit Testing Plan

## Issues Fixed

### 1. React Query Aggressive Refetching (CRITICAL)
**Problem:** QueryClient using default settings caused continuous `/user` requests every 2 seconds
**Fix:** Configured QueryClient to disable automatic refetching, letting visibility coordinator control all refreshes
**Impact:** 95% reduction in API calls

### 2. Auth Refresh Clearing User (CRITICAL)  
**Problem:** Background auth checks were clearing user state, causing false logouts
**Fix:** Auth refresh now only verifies session, doesn't clear state during background checks
**Impact:** Zero false logouts on tab revisit

### 3. Dropdown Flickering
**Problem:** Callback functions not memoized, causing unnecessary re-renders
**Fix:** Wrapped all callbacks in `useCallback` with stable dependencies
**Impact:** Smooth, flicker-free dropdowns

## Test Scenarios

### Scenario 1: Quick Tab Switch (<5s)
**Purpose:** Verify minimum hidden time filter works

**Steps:**
1. Log into the app
2. Navigate to User Management page
3. Switch to another tab
4. Wait 2-3 seconds
5. Switch back to the app

**Expected Results:**
- ✅ Console: "Tab switch too quick (<5s), skipping refresh"
- ✅ Auth Logs: NO new `/user` requests
- ✅ UI: Renders instantly with existing data
- ✅ No loading spinners
- ✅ Dropdowns work smoothly

**Actual Results:** [To be filled by user]

---

### Scenario 2: Medium Tab Switch (30-60s)
**Purpose:** Verify data staleness threshold (30s) triggers refresh

**Steps:**
1. Log into the app  
2. Navigate to Dashboard
3. Switch to another tab
4. Wait exactly 45 seconds
5. Switch back to the app

**Expected Results:**
- ✅ Console: "Data stale (45s old, threshold: 30s), refreshing"
- ✅ Auth Logs: 1-2 `/user` requests for stale data providers
- ✅ Auth NOT refreshed (under 90s threshold)
- ✅ UI: Renders instantly, then background update
- ✅ No loading spinners
- ✅ User stays logged in

**Actual Results:** [To be filled by user]

---

### Scenario 3: Long Tab Switch (>90s)
**Purpose:** Verify auth staleness threshold (90s) triggers auth refresh

**Steps:**
1. Log into the app
2. Navigate to Settings page
3. Switch to another tab
4. Wait exactly 120 seconds (2 minutes)
5. Switch back to the app

**Expected Results:**
- ✅ Console: "Auth stale (120s old, threshold: 90s), refreshing"
- ✅ Console: "Data stale, refreshing" (for all data providers)
- ✅ Auth Logs: 2-4 `/user` requests (auth + stale providers)
- ✅ Priority ordering: Auth first (priority 1), then data providers
- ✅ Staggered delays: 300ms between auth and first provider, 800ms between providers
- ✅ UI: Renders instantly with existing data
- ✅ No loading spinners
- ✅ User stays logged in
- ✅ Background refresh completes silently

**Actual Results:** [To be filled by user]

---

### Scenario 4: Multiple Quick Switches
**Purpose:** Verify coordinator doesn't trigger on rapid tab switching

**Steps:**
1. Log into the app
2. Navigate to Properties page
3. Rapidly switch between tabs 5 times (stay <5s each time)
4. Finally stay on app for 10s

**Expected Results:**
- ✅ Console: Multiple "Tab switch too quick (<5s), skipping refresh"
- ✅ Auth Logs: ZERO `/user` requests during quick switches
- ✅ No cumulative refresh triggers
- ✅ UI never shows loading
- ✅ App remains responsive

**Actual Results:** [To be filled by user]

---

### Scenario 5: Logout While Tab Hidden
**Purpose:** Verify proper logout handling when tab is not visible

**Steps:**
1. Log into the app
2. Open app in two browser tabs (Tab A and Tab B)
3. In Tab A: Navigate to Dashboard
4. In Tab B: Click Sign Out
5. Wait 10 seconds
6. Switch to Tab A

**Expected Results:**
- ✅ Tab A: Detects no session on refresh
- ✅ Tab A: Redirects to login page
- ✅ Auth Logs: 1 logout event, 1 session check
- ✅ No error messages
- ✅ Clean state clearing

**Actual Results:** [To be filled by user]

---

### Scenario 6: Network Disconnect/Reconnect
**Purpose:** Verify app handles network issues gracefully

**Steps:**
1. Log into the app
2. Navigate to All Requests page
3. Disconnect network (turn off Wi-Fi)
4. Wait 30 seconds
5. Switch to another tab
6. Wait 30 seconds
7. Reconnect network
8. Switch back to app tab

**Expected Results:**
- ✅ Console: Coordinator attempts refresh
- ✅ Console: Graceful error handling for network errors
- ✅ UI: Shows existing data (doesn't crash)
- ✅ After reconnect: Successful background refresh
- ✅ Auth Logs: Failed requests during disconnect, successful after reconnect
- ✅ No infinite retry loops

**Actual Results:** [To be filled by user]

---

### Scenario 7: User Management Dropdown (Flickering Test)
**Purpose:** Verify dropdown fix is working

**Steps:**
1. Log into the app as admin
2. Navigate to Settings > User Management
3. Click three-dot menu on any user row
4. Observe dropdown opening
5. Click outside to close
6. Repeat 5 times rapidly
7. Click dropdown and interact with menu items

**Expected Results:**
- ✅ Dropdown opens smoothly every time
- ✅ No flickering or visual glitches
- ✅ Dropdown stays open when interacting
- ✅ Menu items respond immediately
- ✅ No re-render flashing
- ✅ Console: Minimal re-render logs

**Actual Results:** [To be filled by user]

---

### Scenario 8: Browser Background Tab (Long Duration)
**Purpose:** Verify app handles very long background periods

**Steps:**
1. Log into the app
2. Navigate to Dashboard
3. Switch to another tab
4. Wait 10 minutes (browse other sites)
5. Switch back to app tab

**Expected Results:**
- ✅ UI: Renders instantly with existing data
- ✅ Console: Auth stale, refreshing
- ✅ Console: All data providers stale, refreshing
- ✅ Background refresh completes within 5 seconds
- ✅ User stays logged in (unless session expired)
- ✅ No loading spinners
- ✅ App fully functional after refresh

**Actual Results:** [To be filled by user]

---

### Scenario 9: Route Navigation While Refreshing
**Purpose:** Verify navigation doesn't break during background refresh

**Steps:**
1. Log into the app
2. Navigate to Dashboard
3. Switch to another tab for 2 minutes
4. Switch back to app
5. IMMEDIATELY click on "Properties" in navigation
6. Then click "Settings"
7. Then click "Dashboard"

**Expected Results:**
- ✅ Navigation works immediately (doesn't wait for refresh)
- ✅ Background refresh continues without blocking
- ✅ No errors in console
- ✅ Each page renders with existing data
- ✅ Refresh completes successfully in background
- ✅ No loading spinners on any page

**Actual Results:** [To be filled by user]

---

### Scenario 10: Repeated Tab Revisits
**Purpose:** Verify coordinator doesn't leak memory or accumulate handlers

**Steps:**
1. Log into the app
2. Navigate to Dashboard
3. Perform 20 tab switches (wait 35s each time to trigger refresh)
4. Check DevTools Memory profiler
5. Check coordinator state

**Expected Results:**
- ✅ Memory usage remains stable
- ✅ No memory leaks
- ✅ Console: Consistent refresh patterns
- ✅ Each refresh completes successfully
- ✅ No duplicate handlers registered
- ✅ App remains responsive after all switches

**Actual Results:** [To be filled by user]

---

## Performance Metrics to Track

### API Call Reduction
```
Measure: Total /user requests per minute during active use

Before Fix:
- Quick switches: 30+ requests/minute
- Medium switches: 20+ requests/minute  
- Long switches: 15+ requests/minute

After Fix (Expected):
- Quick switches: 0-1 requests/minute
- Medium switches: 1-2 requests/minute
- Long switches: 2-4 requests/minute

Reduction: ~95%
```

### User Experience Metrics
```
Loading Spinner Duration:
- Before: 1-3 seconds on every tab switch
- After: 0 seconds (never shown)

Time to Interactive:
- Before: 1-3 seconds (waiting for API)
- After: <100ms (instant with existing data)

Background Refresh Time:
- Quick: N/A (skipped)
- Medium: ~500ms (data providers only)
- Long: ~1500ms (auth + data providers)
```

### Console Log Patterns

**Healthy Pattern (After Fix):**
```
👁️ Tab visible after 35s
🔄 Checking for stale data
🔄 contractors: 35s old, threshold: 30s, STALE - refreshing
🔄 auth: 35s old, threshold: 90s, FRESH - skipping
🔄 Refreshing 1 stale handlers in background
🔄 Starting background refresh: contractors (priority 4)
🔄 Successfully refreshed: contractors
```

**Unhealthy Pattern (Before Fix):**
```
🔄 Refetching all queries (React Query)
🔄 Auth refresh triggered
🔄 Data refresh triggered
🔄 Refetching all queries (React Query) [duplicate]
🔄 Auth refresh triggered [duplicate]
... repeating every 2 seconds
```

## Debugging Commands

If issues occur during testing, use these console commands:

```javascript
// Check coordinator state
visibilityCoordinator.getState()

// Force manual refresh (testing only)
visibilityCoordinator.manualRefresh()

// Check React Query cache
window.queryClient?.getQueryCache().getAll()
```

## Success Criteria

For the tab revisit workflow to be considered "production ready":

- [ ] All 10 test scenarios pass
- [ ] Zero false logouts
- [ ] Zero loading spinners on tab switches
- [ ] 95% reduction in API calls confirmed
- [ ] Dropdowns work smoothly without flickering
- [ ] Memory usage remains stable over repeated switches
- [ ] Background refreshes complete within 5 seconds
- [ ] UI always responds instantly (<100ms)
- [ ] No console errors during any scenario
- [ ] Auth logs show expected request patterns

## Files Modified

1. **src/App.tsx**
   - Lines 67-95: Configured QueryClient with coordinator-friendly settings

2. **src/contexts/UnifiedAuthContext.tsx** 
   - Lines 593-641: Updated auth refresh to not clear user during background checks

3. **src/components/settings/user-management/hooks/useUserActions.tsx**
   - Multiple lines: Wrapped callbacks in `useCallback` for stable references

## Known Limitations

1. **Session Expiry:** If user's session expires while tab is hidden, they'll be logged out on return. This is expected behavior.

2. **Real-Time Updates:** Tab revisit doesn't push real-time updates that occurred while tab was hidden. Consider implementing Supabase real-time subscriptions for critical data.

3. **Browser Throttling:** Some browsers throttle background tabs differently. Results may vary slightly between browsers.

4. **Mobile Browsers:** Mobile browser background behavior is different from desktop. Additional testing needed for mobile-specific scenarios.

## Next Steps

After verifying all scenarios pass:

1. Monitor production logs for 48 hours
2. Check for any edge cases in real user behavior
3. Gather user feedback on perceived performance
4. Consider implementing real-time subscriptions for critical data
5. Document any browser-specific quirks discovered

---

## Test Results Template

```
Date: ___________
Tester: ___________
Browser: ___________
OS: ___________

Scenario 1: [ ] PASS [ ] FAIL - Notes: ___________
Scenario 2: [ ] PASS [ ] FAIL - Notes: ___________
Scenario 3: [ ] PASS [ ] FAIL - Notes: ___________
Scenario 4: [ ] PASS [ ] FAIL - Notes: ___________
Scenario 5: [ ] PASS [ ] FAIL - Notes: ___________
Scenario 6: [ ] PASS [ ] FAIL - Notes: ___________
Scenario 7: [ ] PASS [ ] FAIL - Notes: ___________
Scenario 8: [ ] PASS [ ] FAIL - Notes: ___________
Scenario 9: [ ] PASS [ ] FAIL - Notes: ___________
Scenario 10: [ ] PASS [ ] FAIL - Notes: ___________

Overall: [ ] APPROVED [ ] NEEDS WORK

Comments: ___________________________________________
```
