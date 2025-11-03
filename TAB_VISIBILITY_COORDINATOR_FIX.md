# Tab Visibility Coordinator - Complete Solution

## Problem Summary
The project was hanging on tab revisit, showing perpetual loading states and preventing users from working. The root cause was:

1. **Uncoordinated refresh cascade**: Three data providers (Properties, Maintenance, Contractors) all independently fired visibility handlers simultaneously
2. **Database congestion**: Multiple complex RLS queries hitting the database at once (each with 30-60s timeouts)
3. **No coordination**: Each provider had its own visibility listener and stale time tracking
4. **Loading state cascade**: Providers would sometimes trigger loading states even after initial load

## Solution Implemented

### 1. Centralized Visibility Coordinator (`src/utils/visibilityCoordinator.ts`)
Created a singleton coordinator that:
- **Registers all data providers** with their refresh functions, stale thresholds, and priorities
- **Tracks last fetch time** for each provider globally
- **Coordinates refresh** on tab visibility change:
  - Filters providers that need refresh (stale > 30s)
  - Sorts by priority (auth → properties → maintenance → contractors)
  - Executes refreshes with **staggered delays** (100-250ms) to prevent database congestion
  - Updates fetch times optimistically
- **Prevents concurrent refreshes** with locking mechanism

### 2. React Context Wrapper (`src/contexts/TabVisibilityContext.tsx`)
Provides the coordinator to all components and:
- Starts visibility listener on mount
- Cleans up on unmount
- Makes coordinator accessible via `useTabVisibility()` hook

### 3. Provider Integration
Updated all data providers to:
- **Register with coordinator** instead of using individual visibility listeners
- **Update coordinator fetch times** after successful data fetches
- **Remove old visibility handlers** to prevent conflicts
- **Keep existing functionality** exactly the same (no behavior changes)

**Updated files:**
- `src/contexts/UnifiedAuthContext.tsx` - Auth refresh (Priority 1)
- `src/contexts/property/usePropertyProvider.ts` - Properties (Priority 2)
- `src/contexts/maintenance/useMaintenanceRequestProvider.ts` - Maintenance (Priority 3)
- `src/contexts/contractor/hooks/useContractorsState.ts` - Contractors (Priority 4)

### 4. App-Level Integration (`src/App.tsx`)
- Added `TabVisibilityProvider` at the top level (wraps UnifiedAuthProvider)
- Increased failsafe timeout from 10s to 15s to accommodate coordinated refresh
- Ensures single global coordination point

### 5. Cleanup
- Deleted `src/utils/silentRefresh.ts` (replaced by coordinator)
- Kept `src/utils/tabVisibility.ts` (generic utility, backward compatible)

## How It Works

### On Tab Revisit:
1. **User switches back to tab** → `visibilitychange` event fires
2. **Coordinator checks** which providers have stale data (>30s old)
3. **Coordinator executes** refreshes in priority order:
   ```
   Auth (Priority 1) → [100ms delay] → 
   Properties (Priority 2) → [250ms delay] → 
   Maintenance (Priority 3) → [250ms delay] → 
   Contractors (Priority 4)
   ```
4. **Each refresh runs in background** (no loading states shown)
5. **Data updates silently** without blocking UI
6. **User can work immediately** with fresh data

### Example Timeline:
```
T+0ms:    Tab becomes visible
T+0ms:    Coordinator checks stale data
T+0ms:    Auth refresh starts
T+100ms:  Properties refresh starts
T+350ms:  Maintenance refresh starts
T+600ms:  Contractors refresh starts
T+1000ms: All data fresh, user working seamlessly
```

## Benefits

✅ **No loading hangs** - Background refresh doesn't block UI
✅ **Always fresh data** - 30s stale threshold ensures current data
✅ **Database-friendly** - Staggered queries prevent congestion
✅ **Seamless UX** - User can work immediately on tab revisit
✅ **Coordinated** - Single point of control prevents race conditions
✅ **Maintainable** - Easy to add new providers or adjust priorities
✅ **Same functionality** - All existing features work exactly as before

## Configuration

### Stale Threshold (per provider):
```typescript
staleThreshold: 30000 // 30 seconds
```
Adjust if you need different refresh behavior (e.g., 60s for less critical data)

### Priority (execution order):
```typescript
priority: 1 // Lower number = higher priority
```
- 1 = Auth (must be first)
- 2 = Properties (core data)
- 3 = Maintenance (depends on properties)
- 4+ = Other providers

### Stagger Delay:
```typescript
const delay = i === 0 ? 100 : 250; // Auth gets 100ms, others 250ms
```
Adjust in `visibilityCoordinator.ts` if needed

## Testing

### Manual Test:
1. Login to project
2. Switch to another browser tab
3. Wait 35+ seconds (past stale threshold)
4. Switch back to project tab
5. ✅ Should see console logs showing coordinated refresh
6. ✅ Should NOT see loading states
7. ✅ Should be able to work immediately
8. ✅ Data should be fresh (add property, contractor, etc.)

### Console Log Pattern (Success):
```
👁️ VisibilityCoordinator - Tab visible after 45 s
🔄 VisibilityCoordinator - Handler needs refresh: auth
🔄 VisibilityCoordinator - Handler needs refresh: properties
🔄 VisibilityCoordinator - Handler needs refresh: maintenance
🔄 VisibilityCoordinator - Handler needs refresh: contractors
🔄 VisibilityCoordinator - Refreshing 4 handlers in priority order
🔄 VisibilityCoordinator - Refreshing: auth (priority 1)
🔄 UnifiedAuth - Coordinator-triggered auth refresh
🔄 VisibilityCoordinator - Refreshing: properties (priority 2)
🔄 PropertyProvider - Coordinator-triggered refresh
🔄 VisibilityCoordinator - Refreshing: maintenance (priority 3)
🔄 MaintenanceRequestProvider - Coordinator-triggered refresh
🔄 VisibilityCoordinator - Refreshing: contractors (priority 4)
🔄 ContractorProvider - Coordinator-triggered refresh
🔄 VisibilityCoordinator - Coordinated refresh complete
```

## Debugging

### Check coordinator state:
```typescript
import { visibilityCoordinator } from '@/utils/visibilityCoordinator';
console.log(visibilityCoordinator.getState());
```

### Force manual refresh:
```typescript
visibilityCoordinator.manualRefresh();
```

## Future Enhancements

Possible improvements (not needed now, but easy to add):
- Adaptive stale thresholds based on usage patterns
- Per-user priority preferences
- Refresh analytics/monitoring
- Smart prefetch on user navigation patterns
- Configurable delays per provider
