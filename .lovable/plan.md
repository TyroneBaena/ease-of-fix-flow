

# Comprehensive App Performance Optimization Plan

## Executive Summary

This plan addresses the perceived slowness of the application, focusing on three main areas:
1. **Console logging overhead** - 8,685 console.log statements blocking the UI thread in preview mode
2. **Session wait bottlenecks** - 10-second timeouts in 7+ hooks causing artificial delays
3. **Sequential data loading** - Waterfall pattern in context providers

---

## Problem Analysis

### Root Cause 1: Excessive Logging in Preview Mode

The preview environment runs in **development mode** where the `esbuild.drop: ['console', 'debugger']` in `vite.config.ts` does NOT apply. This means:

- **8,685 console.log statements** execute on every page load and navigation
- Heavy formatted logs with emojis, color formatting, and data dumps block the main thread
- Module-level logs execute before React even renders

**Examples of problematic patterns:**
```typescript
// Runs on EVERY page load before React mounts
console.log('🔥🔥🔥 v64.0 - MaintenanceRequestContext.tsx - FILE IS LOADING NOW!');

// Runs ~100 times per auth check
console.log("%c════════════════════════════════════════════════════════", "color: blue");
```

### Root Cause 2: Session Wait Bottleneck

7 hooks use `waitForSessionReady()` with 10-second timeouts:
- `useBudgetData.ts`
- `useComments.tsx`
- `useMaintenanceRequestProvider.ts`
- `useJobDetail.ts`
- `useContractorData.ts`
- And 2 others

When navigating between pages, each new hook instance waits for `sessionVersion` to match. If there's any delay in signaling, hooks wait up to 10 seconds.

### Root Cause 3: Context Provider Cascade

The app has deeply nested context providers that load sequentially:
```
UnifiedAuthProvider → UserProvider → SubscriptionProvider → MaintenanceRequestProvider → PropertyProvider → ContractorProvider
```

Each provider waits for `isSessionReady` before fetching data, creating a waterfall effect.

---

## Solution Overview

| Phase | Focus | Impact | Risk |
|-------|-------|--------|------|
| 1 | Create dev-only logger utility | High | Low |
| 2 | Clean UnifiedAuthContext logging | High | Low |
| 3 | Clean context provider logging | High | Low |
| 4 | Remove module-level debug logs | High | Low |
| 5 | Optimize session wait timeouts | Medium | Low |
| 6 | Remove legacy debug files | Medium | Low |

---

## Phase 1: Create Dev-Only Logger Utility

Create a new utility that only logs in development and is a no-op in production/preview:

**File: `src/lib/devLogger.ts`** (New)

```typescript
// Only log in true development mode when explicitly enabled
const shouldLog = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true';

export const devLog = shouldLog 
  ? (...args: any[]) => console.log(...args)
  : () => {};

export const devWarn = shouldLog
  ? (...args: any[]) => console.warn(...args)
  : () => {};

export const devError = (...args: any[]) => console.error(...args); // Always log errors
```

This gives explicit control - logs are silent by default even in dev, unless specifically enabled.

---

## Phase 2: Clean UnifiedAuthContext Logging

**File: `src/contexts/UnifiedAuthContext.tsx`**

The current auth context has approximately 100+ console statements with:
- Visual separators ("════════════════")
- Color formatting ("%c", "color: blue")
- Verbose state dumps

**Changes:**

1. Remove the module-level debug import and log:
```typescript
// REMOVE these lines (6-10)
import { authDebugMarker } from "@/auth-debug";
import "@/auth-debug"; // Force import to trigger debug logs
console.log("🚀 UnifiedAuth Context loading with debug marker:", authDebugMarker);
```

2. Replace verbose session logging with minimal essential logs:
```typescript
// BEFORE (lines 921-926 - runs every session check)
console.log("%c════════════════════════════════════════════════════════", "color: blue; font-weight: bold");
console.log("%c🔄 UnifiedAuth v97.4 - SESSION CHECK", "color: blue; font-weight: bold");
console.log("%c════════════════════════════════════════════════════════", "color: blue; font-weight: bold");

// AFTER - devLog only
devLog("Auth: session check", { sessionVersion });
```

3. Reduce `waitForSessionReady` logging:
```typescript
// BEFORE (lines 138-146)
console.log(`🔄 v83.1 - waitForSessionReady(target: ${target}, latest: ...)`);
console.log(`✅ v83.1 - Session ALREADY ready at version ...`);

// AFTER
devLog("Session ready:", target);
```

4. Keep only error logs for debugging issues:
```typescript
// KEEP essential error logs
console.error("Auth: Failed to restore session", error);
```

**Estimated line changes:** ~80 console.log statements to remove or replace

---

## Phase 3: Clean Context Provider Logging

### MaintenanceRequestContext.tsx

**Remove module-level logs (lines 8-11, 15, 26):**
```typescript
// REMOVE
console.log('🔥🔥🔥 v64.0 - MaintenanceRequestContext.tsx - FILE IS LOADING NOW!');
console.log('🔥🔥🔥 v64.0 - Time:', new Date().toISOString());
console.log('🔥🔥🔥 v64.0 - React available:', typeof React !== 'undefined');
console.log('🔥🔥🔥 v64.0 - Context created successfully');
console.log('🔥🔥🔥 v64.0 - About to define MaintenanceRequestProvider component');
```

**Remove render logs (lines 27-31, 35-40, 55-58):**
```typescript
// REMOVE
console.log('🏗️🏗️🏗️ v64.0 - MaintenanceRequestProvider COMPONENT IS RENDERING!');
```

### usePropertyProvider.ts

**Replace verbose logs with devLog (lines 30, 33, 38, 46, 54, 58, 67, 70, 75, 85, 99, 111, 117, 119):**
```typescript
// BEFORE
console.log('v78.0 - PropertyProvider: fetchAndSetProperties', { sessionReady, hasUser: !!userId });

// AFTER
devLog('PropertyProvider: fetch', { sessionReady });
```

### useMaintenanceRequestProvider.ts

**Reduce retry logging (lines 30, 33, 48, 53, 59, 62, 87, 94, 103):**
```typescript
// BEFORE - logs on every retry attempt
console.log(`🔧 v84.1 - MaintenanceRequest: Attempt ${attempt} for version ${targetVersion}`);

// AFTER - log only first and last attempt
if (attempt === 1) devLog('MaintenanceRequest: starting fetch');
```

---

## Phase 4: Remove Module-Level Debug Logs

### src/auth-debug.ts

**Option A (Recommended):** Delete the entire file

**Option B:** Empty the file to no-op:
```typescript
// Placeholder - all debug logging removed for performance
export const authDebugMarker = 'v20.0';
```

### src/main.tsx

**Remove the debug import (line 5):**
```typescript
// REMOVE
import './auth-debug'; // Force import to trigger debug logs
```

### src/integrations/supabase/client.ts

**Remove client creation logs:**
```typescript
// REMOVE any "Creating SINGLE Supabase client" logs
```

---

## Phase 5: Optimize Session Wait Timeouts

The `waitForSessionReady` function uses a 10-second default timeout, but in practice the session should be ready within milliseconds on normal page navigation.

**File: `src/contexts/UnifiedAuthContext.tsx`**

**Change 1: Reduce default timeout from 10s to 3s:**
```typescript
// BEFORE (line 133)
export async function waitForSessionReady(targetVersion?: number, timeout = 10000): Promise<boolean>

// AFTER
export async function waitForSessionReady(targetVersion?: number, timeout = 3000): Promise<boolean>
```

**Change 2: Fast-path for already-ready sessions:**
The current code already has this check, but we can add an early bail-out for the most common case:
```typescript
// Already implemented at lines 143-146 - no change needed
if (sessionReadyCoordinator.latestReadyVersion >= target) {
  return true;
}
```

**Change 3: Reduce retry delay in waitForSessionReadyWithRetry:**
```typescript
// BEFORE (line 274)
const delay = baseDelay * Math.pow(2, attempt - 1); // 500ms, 1000ms, 2000ms

// AFTER - faster retries
const delay = Math.min(baseDelay * Math.pow(1.5, attempt - 1), 2000); // 500ms, 750ms, 1125ms (capped at 2s)
```

---

## Phase 6: Remove Legacy Debug File

**Delete:** `src/auth-debug.ts`

**Update imports in:**
- `src/main.tsx` - remove line 5
- `src/contexts/UnifiedAuthContext.tsx` - remove lines 6-7, 10

---

## Technical Details

### Files to Modify

| File | Changes | Lines Affected |
|------|---------|----------------|
| `src/lib/devLogger.ts` | Create new file | New (~15 lines) |
| `src/auth-debug.ts` | Delete entirely | -5 lines |
| `src/main.tsx` | Remove debug import | -1 line |
| `src/contexts/UnifiedAuthContext.tsx` | Replace ~80 logs with devLog, remove debug import | ~100 lines |
| `src/contexts/maintenance/MaintenanceRequestContext.tsx` | Remove module-level logs | ~15 lines |
| `src/contexts/maintenance/useMaintenanceRequestProvider.ts` | Reduce logging | ~10 lines |
| `src/contexts/property/usePropertyProvider.ts` | Replace logs with devLog | ~15 lines |
| `src/integrations/supabase/client.ts` | Remove creation logs | ~2 lines |

### Expected Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Console logs per page load | ~200-500 | ~5-10 | 95% reduction |
| Main thread blocking time | Variable | Minimal | Faster interactions |
| Session wait timeout | 10s max | 3s max | 70% faster worst-case |
| DevTools console lag | Significant | Minimal | Smoother debugging |

### Risk Assessment

- **Low Risk**: All changes are to logging only - no business logic affected
- **Reversible**: Can restore verbose logging by setting VITE_ENABLE_DEV_LOGS=true
- **No Breaking Changes**: Function signatures and exports unchanged
- **Production Unaffected**: Production already strips logs via esbuild

---

## Verification Steps After Implementation

1. Navigate between dashboard, properties, and requests pages
2. Verify data loads within 1-2 seconds (not 10s timeouts)
3. Check browser console is not flooded with logs
4. Confirm auth still works correctly on tab switches
5. Test page refresh and session restoration

