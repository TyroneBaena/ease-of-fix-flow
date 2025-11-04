/**
 * Tab Visibility Coordinator v5.0
 *
 * Handles safe data refresh when user revisits the tab.
 * - No forced reload (prevents logout or data loss)
 * - Coordinates refresh across registered data providers
 * - Executes refreshes immediately without blocking
 */

type RefreshHandler = () => Promise<void | boolean> | void | boolean;

class VisibilityCoordinator {
  private isRefreshing = false;
  private refreshHandlers: RefreshHandler[] = [];
  private isListening = false;
  private lastHiddenTime: number | null = null;

  /**
   * Register a handler to run when refreshing data on tab visibility change
   * Returns cleanup function to unregister the handler
   */
  public onRefresh(handler: RefreshHandler): () => void {
    // Prevent duplicate registrations
    if (!this.refreshHandlers.includes(handler)) {
      this.refreshHandlers.push(handler);
      console.log(`📝 Registered refresh handler (total: ${this.refreshHandlers.length})`);
    }
    
    // Return cleanup function
    return () => {
      const index = this.refreshHandlers.indexOf(handler);
      if (index > -1) {
        this.refreshHandlers.splice(index, 1);
        console.log(`🗑️ Unregistered refresh handler (remaining: ${this.refreshHandlers.length})`);
      }
    };
  }

  /**
   * Start listening for visibility changes
   */
  public startListening() {
    if (this.isListening) return;
    this.isListening = true;

    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    console.log("👀 VisibilityCoordinator started listening for tab visibility changes");
  }

  /**
   * Stop listening for visibility changes
   */
  public stopListening() {
    if (!this.isListening) return;
    this.isListening = false;

    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    console.log("👀 VisibilityCoordinator stopped listening");
  }

  /**
   * Handle visibility change events
   */
  private handleVisibilityChange = () => {
    if (document.hidden) {
      this.lastHiddenTime = Date.now();
      console.log("🔒 Tab hidden at", new Date(this.lastHiddenTime).toISOString());
    } else {
      const now = Date.now();
      const hiddenDuration = this.lastHiddenTime ? now - this.lastHiddenTime : 0;

      console.log(`🔓 Tab visible again after ${hiddenDuration / 1000}s`);

      // Only refresh if tab was hidden for more than 5 seconds
      if (hiddenDuration > 5000) {
        this.coordinateRefresh();
      }

      this.lastHiddenTime = null;
    }
  };

  /**
   * Coordinate data refresh across all tabs when tab becomes visible again
   * Executes auth first, then other handlers in parallel
   */
  private async coordinateRefresh() {
    if (this.isRefreshing) {
      console.log("⚙️ Refresh already in progress — skipping duplicate refresh");
      return;
    }

    this.isRefreshing = true;
    console.log(`🔁 Coordinating refresh (${this.refreshHandlers.length} handlers registered)...`);

    try {
      // CRITICAL: Execute auth handler first (it's always registered first)
      // This ensures session AND user are fully restored before other queries run
      if (this.refreshHandlers.length > 0) {
        const authHandler = this.refreshHandlers[0];
        const authSuccess = await authHandler();
        
        // CRITICAL FIX: Only proceed if auth actually succeeded
        if (authSuccess === true) {
          console.log("✅ Auth handler completed, session and user restored");
          
          // CRITICAL: Longer delay (800ms) to ensure:
          // 1. Session is set in Supabase client
          // 2. User conversion completes  
          // 3. React context state updates propagate
          // 4. Queries have authenticated user context
          await new Promise(resolve => setTimeout(resolve, 800));
          console.log("✅ Auth propagation complete, ready for data queries");
        } else {
          console.error("❌ Auth handler failed - session restoration unsuccessful");
          console.warn("⚠️ Skipping data refresh - user needs to re-login");
          this.isRefreshing = false;
          return; // Don't proceed with data handlers if auth failed
        }
      }
      
      // Execute remaining handlers in parallel
      if (this.refreshHandlers.length > 1) {
        const dataHandlers = this.refreshHandlers.slice(1);
        await Promise.all(dataHandlers.map(handler => handler()));
        console.log("✅ All data handlers completed successfully");
      }
    } catch (error) {
      console.error("❌ Error during coordinated refresh", error);
    } finally {
      this.isRefreshing = false;
    }
  }
}

export const visibilityCoordinator = new VisibilityCoordinator();
