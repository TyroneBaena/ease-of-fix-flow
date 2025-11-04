# Tab Revisit Query Timeout - Comprehensive Fix

## Root Cause
Session storage (sessionStorage + cookies) was being cleared on ANY `SIGNED_OUT` event, including failed token refreshes. This made retries impossible on 2nd revisit.

## Solution Implemented

### 1. Protect Backups (client.ts)
- Only clear storage on **explicit** user signout
- Preserve backups on session failures to allow retry
- Added `isExplicitSignOut` flag to distinguish user action from system events

### 2. Aggressive Keepalive (client.ts)
- Increased from 4 minutes to **2 minutes**
- Prevents session staleness during tab inactivity
- Automatically backs up after each refresh

### 3. Single Realtime Reconnection (visibilityCoordinator.ts)
- Centralized in `reconnectRealtime()` function
- Called ONCE after successful auth restoration
- Eliminates race conditions from multiple reconnect attempts

### 4. Extended Timeouts (useRequestQuotes.ts)
- Increased from 10s to **30s**
- Allows time for full session restoration cycle
- Prevents premature timeout errors

### 5. Force Re-Backup (UnifiedAuthContext.tsx)
- Immediately backs up restored session
- Ensures storage is fresh for next revisit
- Prevents storage loss on rapid tab switches

### 6. Pre-Hide Backup (visibilityCoordinator.ts)
- Backs up session BEFORE disconnecting Realtime
- Ensures synchronous storage write completes
- Added beforeunload event as safety net

## Testing
1. Login → hide tab 10s → show → hide 10s → show → click request
2. Should see "✅ Auth handler completed" and NO timeouts
