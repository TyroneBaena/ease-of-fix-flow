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
        console.log('👁️ VisibilityCoordinator - Tab visible after', Math.round(timeSinceLastChange / 1000), 's');
        this.lastVisibilityChange = Date.now();
        
        // Trigger coordinated refresh
        this.coordinateRefresh();
      } else {
        console.log('👁️ VisibilityCoordinator - Tab hidden');
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
   * Executes in priority order with staggered delays to prevent database congestion
   */
  private async coordinateRefresh() {
    if (this.isRefreshing) {
      console.log('🔄 VisibilityCoordinator - Refresh already in progress, skipping');
      return;
    }

    this.isRefreshing = true;

    try {
      const now = Date.now();
      
      // Filter handlers that need refresh (data is stale)
      const staleHandlers = Array.from(this.handlers.values())
        .filter(handler => {
          const timeSinceLastFetch = now - handler.lastFetchTime;
          const isStale = timeSinceLastFetch > handler.staleThreshold;
          
          if (isStale) {
            console.log('🔄 VisibilityCoordinator - Handler needs refresh:', handler.id, 
              'Time since last fetch:', Math.round(timeSinceLastFetch / 1000), 's');
          }
          
          return isStale;
        })
        .sort((a, b) => a.priority - b.priority); // Sort by priority

      if (staleHandlers.length === 0) {
        console.log('🔄 VisibilityCoordinator - All data fresh, no refresh needed');
        return;
      }

      console.log('🔄 VisibilityCoordinator - Refreshing', staleHandlers.length, 'handlers in priority order');

      // Execute refreshes with staggered delays
      for (let i = 0; i < staleHandlers.length; i++) {
        const handler = staleHandlers[i];
        
        try {
          console.log('🔄 VisibilityCoordinator - Refreshing:', handler.id, '(priority', handler.priority + ')');
          
          // Execute refresh (don't await - let it run in background)
          handler.refresh().catch(error => {
            console.error('🔄 VisibilityCoordinator - Refresh error for', handler.id, ':', error);
          });
          
          // Update fetch time immediately (optimistic)
          handler.lastFetchTime = Date.now();
          
          // Stagger next refresh to prevent database congestion
          // Higher priority items refresh immediately, others wait
          if (i < staleHandlers.length - 1) {
            const delay = i === 0 ? 100 : 250; // Auth gets 100ms, others 250ms
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (error) {
          console.error('🔄 VisibilityCoordinator - Error refreshing', handler.id, ':', error);
        }
      }

      console.log('🔄 VisibilityCoordinator - Coordinated refresh complete');
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
