/**
 * Tab Visibility Coordinator
 * 
 * Coordinates data refresh across multiple providers when user revisits the tab
 * Prevents simultaneous queries that cause blocking and loading states
 * Ensures data is fresh without overwhelming the database
 */

export interface RefreshHandler {
  id: string;
  refresh: () => Promise<void>;
  staleThreshold: number; // milliseconds
  priority: number; // Lower number = higher priority (1 = highest)
  lastFetchTime: number;
}

class VisibilityCoordinator {
  private handlers: Map<string, RefreshHandler> = new Map();
  private isRefreshing = false;
  private lastVisibilityChange = Date.now();
  private visibilityListener: (() => void) | null = null;

  /**
   * Register a data provider for coordinated refresh
   */
  register(handler: Omit<RefreshHandler, 'lastFetchTime'>) {
    console.log('🔄 VisibilityCoordinator - Registering handler:', handler.id);
    this.handlers.set(handler.id, {
      ...handler,
      lastFetchTime: Date.now()
    });
  }

  /**
   * Unregister a data provider
   */
  unregister(handlerId: string) {
    console.log('🔄 VisibilityCoordinator - Unregistering handler:', handlerId);
    this.handlers.delete(handlerId);
  }

  /**
   * Update last fetch time for a handler (called after successful refresh)
   */
  updateLastFetchTime(handlerId: string) {
    const handler = this.handlers.get(handlerId);
    if (handler) {
      handler.lastFetchTime = Date.now();
      console.log('🔄 VisibilityCoordinator - Updated fetch time for:', handlerId);
    }
  }

  /**
   * Start listening for visibility changes
   */
  startListening() {
    if (this.visibilityListener) {
      console.warn('🔄 VisibilityCoordinator - Already listening');
      return;
    }

    console.log('🔄 VisibilityCoordinator - Starting visibility listener');
    
    this.visibilityListener = () => {
      if (!document.hidden) {
        const timeSinceLastChange = Date.now() - this.lastVisibilityChange;
        console.log('👁️ VisibilityCoordinator v3.0 - Tab visible after', Math.round(timeSinceLastChange / 1000), 's');
        this.lastVisibilityChange = Date.now();
        
        // ALWAYS trigger refresh check - coordinator will decide what's stale
        // This ensures data is fresh regardless of how long user was away
        console.log('👁️ VisibilityCoordinator v3.0 - Checking for stale data');
        this.coordinateRefresh();
      } else {
        console.log('👁️ VisibilityCoordinator v3.0 - Tab hidden');
        this.lastVisibilityChange = Date.now();
      }
    };

    document.addEventListener('visibilitychange', this.visibilityListener);
  }

  /**
   * Stop listening for visibility changes
   */
  stopListening() {
    if (this.visibilityListener) {
      console.log('🔄 VisibilityCoordinator - Stopping visibility listener');
      document.removeEventListener('visibilitychange', this.visibilityListener);
      this.visibilityListener = null;
    }
  }

  /**
   * Coordinate refresh across all registered handlers
   * CRITICAL: This runs in background - NEVER blocks UI or shows loading states
   * Only refreshes data that is actually stale based on each handler's threshold
   */
  private async coordinateRefresh() {
    if (this.isRefreshing) {
      console.log('🔄 VisibilityCoordinator v3.0 - Refresh already in progress, skipping');
      return;
    }

    this.isRefreshing = true;

    try {
      const now = Date.now();
      
      // Filter handlers that need refresh (data is stale based on THEIR threshold)
      const staleHandlers = Array.from(this.handlers.values())
        .filter(handler => {
          const timeSinceLastFetch = now - handler.lastFetchTime;
          const isStale = timeSinceLastFetch > handler.staleThreshold;
          
          console.log(`🔄 VisibilityCoordinator v3.0 - ${handler.id}: ${Math.round(timeSinceLastFetch / 1000)}s old, threshold: ${Math.round(handler.staleThreshold / 1000)}s, ${isStale ? 'STALE - refreshing' : 'FRESH - skipping'}`);
          
          return isStale;
        })
        .sort((a, b) => a.priority - b.priority); // Sort by priority

      if (staleHandlers.length === 0) {
        console.log('🔄 VisibilityCoordinator v3.0 - All data fresh, no refresh needed');
        return;
      }

      console.log('🔄 VisibilityCoordinator v3.0 - Refreshing', staleHandlers.length, 'stale handlers in background');

      // Execute refreshes with staggered delays - BACKGROUND ONLY, NO BLOCKING
      for (let i = 0; i < staleHandlers.length; i++) {
        const handler = staleHandlers[i];
        
        try {
          console.log('🔄 VisibilityCoordinator v3.0 - Starting background refresh:', handler.id, '(priority', handler.priority + ')');
          
          // Execute refresh in background (don't await - truly non-blocking)
          handler.refresh().catch(error => {
            console.error('🔄 VisibilityCoordinator v3.0 - Background refresh error for', handler.id, ':', error);
          });
          
          // Update fetch time immediately (optimistic)
          handler.lastFetchTime = Date.now();
          
          // Stagger next refresh to prevent database congestion
          if (i < staleHandlers.length - 1) {
            const delay = i === 0 ? 200 : 500; // Reasonable spacing
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (error) {
          console.error('🔄 VisibilityCoordinator v3.0 - Error refreshing', handler.id, ':', error);
        }
      }

      console.log('🔄 VisibilityCoordinator v3.0 - Background refresh initiated for all stale handlers');
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Manually trigger refresh (for testing or manual refresh buttons)
   */
  async manualRefresh() {
    console.log('🔄 VisibilityCoordinator - Manual refresh triggered');
    await this.coordinateRefresh();
  }

  /**
   * Get current state for debugging
   */
  getState() {
    return {
      handlers: Array.from(this.handlers.entries()).map(([id, handler]) => ({
        id,
        priority: handler.priority,
        staleThreshold: handler.staleThreshold,
        lastFetchTime: handler.lastFetchTime,
        timeSinceLastFetch: Date.now() - handler.lastFetchTime
      })),
      isRefreshing: this.isRefreshing,
      lastVisibilityChange: this.lastVisibilityChange
    };
  }
}

// Singleton instance
export const visibilityCoordinator = new VisibilityCoordinator();
