# Tab Revisit Fix v37.0 - Proactive Session Monitoring

## Problem After v36.0

After v36.0, tab revisits worked for 2-3 times, then queries would fail with timeouts. Console logs revealed:

```
⚠️ No session to backup on hide
❌ Auth handler failed after 0ms - session restoration unsuccessful
⚠️ Skipping data refresh - user needs to re-login
```

**Root Cause**: After multiple tab revisits, Supabase's built-in localStorage persistence was somehow getting cleared. When the tab was hidden, there was **already no session** in the Supabase client, so our backup mechanisms couldn't save anything.

## The Issue Chain

1. **Tab 1-2 revisits**: Work fine, session is present
2. **Between revisits**: Something causes Supabase client to lose its localStorage session
3. **Tab 3+ revisits**: When tab is hidden, `supabase.auth.getSession()` returns nothing
4. **Backup fails**: Cookie and sessionStorage backups are empty because source was empty
5. **Restoration fails**: No session anywhere to restore from
6. **Queries fail**: All data providers timeout without valid auth

## Solution: Proactive Session Monitoring (v37.0)

Instead of waiting for the tab to be hidden to discover the session is gone, we now **actively monitor** and **proactively restore** sessions.

### Key Changes

#### 1. Enhanced Periodic Backup with Auto-Restoration
**File**: `src/integrations/supabase/client.ts` (lines 326-354)

```typescript
// Before v37.0
if (!session) {
  console.log("⏰ No active session to backup");
  stopPeriodicBackup();
}

// After v37.0
if (!session) {
  console.warn("⏰ v37.0 - No session in client, attempting restoration...");
  const restored = await restoreSessionFromBackup();
  if (restored?.access_token) {
    console.log("✅ v37.0 - Session restored proactively by periodic backup");
  } else {
    stopPeriodicBackup();
  }
}
```

**Impact**: Every 15 seconds, if the Supabase client has lost its session but our backups still have it, we **immediately restore** it.

#### 2. Enhanced Keepalive with Session Health Check
**File**: `src/integrations/supabase/client.ts` (lines 363-414)

```typescript
// Before v37.0
// Directly refreshSession() without checking if session exists

// After v37.0
const { data: { session: currentSession } } = await supabase.auth.getSession();

if (!currentSession?.access_token) {
  console.warn("💓 v37.0 - Supabase client lost session! Attempting restoration...");
  
  const restored = await restoreSessionFromBackup();
  if (restored?.access_token) {
    console.log("✅ v37.0 - Session restored proactively by keepalive");
    forceSessionBackup(restored);
    return;
  }
}
```

**Impact**: Every 2 minutes, we verify the session exists in Supabase client. If not, restore from backup.

#### 3. Multi-Attempt Pre-Hide Backup
**File**: `src/utils/visibilityCoordinator.ts` (lines 61-108)

```typescript
// Before v37.0
const { data: { session } } = await supabase.auth.getSession();
if (session) {
  forceSessionBackup(session);
} else {
  console.warn("⚠️ No session to backup on hide");
}

// After v37.0
let session = null;
let attempts = 0;
const maxAttempts = 3;

while (!session?.access_token && attempts < maxAttempts) {
  attempts++;
  const { data: { session: currentSession } } = await supabase.auth.getSession();
  
  if (currentSession?.access_token) {
    session = currentSession;
    break;
  } else {
    // Try to restore from backup if client lost it
    const restored = await restoreSessionFromBackup();
    if (restored?.access_token) {
      session = restored;
      console.log("✅ v37.0 - Session restored before hiding tab");
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}
```

**Impact**: Before hiding tab, we make **3 attempts** to get/restore session, ensuring we always have something to backup.

## How It Works Now

### Normal Flow (Session Present)
1. **Periodic backup** (15s): Backs up session
2. **Keepalive** (2 min): Refreshes session
3. **Tab hidden**: Backs up session
4. **Tab visible**: Restores from backup if needed
5. ✅ **Queries succeed**

### Recovery Flow (Session Lost)
1. **Periodic backup** detects no session → Restores from backup → Continues monitoring
2. **OR** **Keepalive** detects no session → Restores from backup → Continues monitoring
3. **OR** **Tab hiding** detects no session → Restores from backup → Backs up → Continues
4. ✅ **Session is back in Supabase client**

### Defense in Depth
- **Layer 1**: Keepalive monitors every 2 minutes
- **Layer 2**: Periodic backup monitors every 15 seconds
- **Layer 3**: Pre-hide backup checks and restores
- **Layer 4**: Tab revisit restoration (existing v36.0 logic)

## Expected Console Output

### Successful Tab Revisit (with proactive restoration)
```
⏰ v37.0 - No session in client, attempting restoration...
✅ v37.0 - Session restored proactively by periodic backup
🔒 Tab hidden at 2025-11-04T13:00:00.000Z
💾 v37.0 - Pre-hide session backup successful
👀 Tab hidden — disconnecting Realtime temporarily...
🔓 Tab visible again after 25.5s
🔁 Coordinating refresh (2 handlers registered)...
✅ Auth handler completed in 1200ms, session and user restored
✅ Coordinator refresh cycle complete in 1300ms
```

### Prevented Session Loss
```
💓 v37.0 - Supabase client lost session! Attempting restoration...
✅ v37.0 - Session restored proactively by keepalive
💾 Forced multi-layer session backup
```

## Testing Scenarios

### Test 1: Multiple Rapid Revisits
1. Login to app
2. Hide/show tab 5-10 times rapidly (5-10 seconds each)
3. ✅ Expected: All revisits work, queries succeed
4. ✅ Expected: Logs show successful restoration if needed

### Test 2: Long Duration Revisits  
1. Login to app
2. Hide tab for 2-5 minutes
3. Show tab
4. ✅ Expected: Session restored, queries succeed
5. Repeat 5-10 times
6. ✅ Expected: All revisits work, no failures

### Test 3: Mixed Duration
1. Login to app
2. Hide tab for 10s, show
3. Hide tab for 3 minutes, show
4. Hide tab for 30s, show
5. Hide tab for 5 minutes, show
6. ✅ Expected: All transitions work seamlessly

### Test 4: Session Loss Recovery
1. Login to app
2. Wait 2-4 minutes (triggers keepalive/periodic checks)
3. Check console for proactive restoration logs
4. ✅ Expected: See "Session restored proactively" if needed
5. Hide/show tab
6. ✅ Expected: Queries still succeed

## Why This Works

1. **Multiple Watchers**: We have 3 independent mechanisms watching for session loss
2. **Proactive Restoration**: We restore sessions BEFORE they're needed, not after failure
3. **Defense in Depth**: Even if one mechanism fails, others will catch it
4. **Fast Detection**: 15-second periodic check means max 15s until we detect and fix loss
5. **Multi-Layer Backup**: Session is backed up to both cookie and sessionStorage
6. **Retry Logic**: Pre-hide backup has 3 attempts with restoration fallback

## Changes Made

### Modified Files
1. **src/integrations/supabase/client.ts**
   - Enhanced `startPeriodicBackup()` with proactive restoration
   - Enhanced `startKeepalive()` with session health check
   
2. **src/utils/visibilityCoordinator.ts**
   - Enhanced `handleVisibilityChange()` with multi-attempt backup
   - Added restoration fallback before hiding tab

### No Changes Needed To
- `src/contexts/UnifiedAuthContext.tsx` (v36.0 logic still valid)
- Other data providers (they already gate on `isSessionReady`)

## Result

**Tab revisits should now work UNLIMITED times** regardless of:
- Number of revisits
- Duration of tab being hidden  
- Time between revisits
- Browser sleep/wake cycles

The proactive monitoring ensures that even if Supabase client loses its localStorage session, we immediately detect and restore it from our multi-layer backups (cookie + sessionStorage).
