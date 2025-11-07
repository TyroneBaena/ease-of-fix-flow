/**
 * Tab Visibility Coordinator v40.0 - Consolidated Session Management
 *
 * CRITICAL: Now handles BOTH session restoration AND data refresh
 * - Calls App.tsx rehydrateSessionFromServer() on tab revisit
 * - Then triggers data provider refreshes
 * - Single source of truth for tab revisit workflow
 * - Eliminates race conditions from multiple event listeners
 */

type RefreshHandler = () => Promise<void | boolean> | void | boolean;

class VisibilityCoordinator {
  private isRefreshing = false;
  private refreshHandlers: RefreshHandler[] = [];
  private isListening = false;
  private lastHiddenTime: number | null = null;
  private sessionReadyCallback: (() => boolean) | null = null;

  /**
   * Set a callback to check if session is ready
   * This allows the coordinator to wait for session before triggering refreshes
   */
  public setSessionReadyCallback(callback: () => boolean) {
    this.sessionReadyCallback = callback;
    console.log('📝 Set session ready callback for coordinator');
  }

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
   * v37.0: Added proactive restoration if client session is lost
   */
  private handleVisibilityChange = async () => {
    if (document.hidden) {
      this.lastHiddenTime = Date.now();
      console.log("🔒 Tab hidden at", new Date(this.lastHiddenTime).toISOString());
    } else {
      const now = Date.now();
      const hiddenDuration = this.lastHiddenTime ? now - this.lastHiddenTime : 0;

      console.log(`🔓 Tab visible again after ${hiddenDuration / 1000}s`);

      // CRITICAL FIX: Always refresh on tab revisit, regardless of duration
      // This ensures session is restored even for quick tab switches
      this.coordinateRefresh();

      this.lastHiddenTime = null;
    }
  };

  /**
   * Coordinate session restoration + data refresh when tab becomes visible
   * v40.0: Consolidated - handles BOTH session restore AND data refresh
   */
  private async coordinateRefresh() {
    if (this.isRefreshing) {
      console.warn("⚙️ Refresh already in progress, skipping");
      return;
    }

    this.isRefreshing = true;
    const coordinatorStartTime = Date.now();
    console.log(`🔁 v40.0 - Starting coordinated tab revisit workflow...`);

    try {
      // STEP 1: Restore session from HttpOnly cookie
      console.log("📡 v40.0 - Step 1: Restoring session from server...");
      const { rehydrateSessionFromServer } = await import('@/App');
      const restored = await rehydrateSessionFromServer();
      
      if (restored) {
        console.log("✅ v40.0 - Session restored successfully");
        
        // STEP 2: Wait for session to propagate to context
        console.log("⏳ v40.0 - Step 2: Waiting for session ready...");
        let attempts = 0;
        const maxAttempts = 20; // 2 seconds max wait (20 * 100ms)
        
        while (attempts < maxAttempts && this.sessionReadyCallback && !this.sessionReadyCallback()) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (this.sessionReadyCallback && this.sessionReadyCallback()) {
          console.log(`✅ v40.0 - Session ready after ${attempts * 100}ms`);
        } else {
          console.warn("⚠️ v40.0 - Session ready timeout, proceeding anyway");
        }
      } else {
        console.warn("⚠️ v40.0 - Session restore failed, skipping data refresh");
        return;
      }

      // STEP 3: Execute all data refresh handlers in parallel
      console.log(`🔁 v40.0 - Step 3: Refreshing data (${this.refreshHandlers.length} handlers)...`);
      if (this.refreshHandlers.length > 0) {
        await Promise.all(
          this.refreshHandlers.map(async (handler) => {
            try {
              await handler();
            } catch (error) {
              console.error("Handler error:", error);
            }
          })
        );
        console.log("✅ v40.0 - All data handlers completed");
      }
    } catch (error) {
      console.error("❌ v40.0 - Error during coordinated refresh:", error);
    } finally {
      this.isRefreshing = false;
      const totalDuration = Date.now() - coordinatorStartTime;
      console.log(`✅ v40.0 - Coordinator complete in ${totalDuration}ms`);
    }
  }
}

export const visibilityCoordinator = new VisibilityCoordinator();
