/**
 * Tab Visibility Coordinator v39.0 - Session-Aware Refresh
 *
 * Coordinates data refreshes on tab revisit while respecting session state.
 * - Waits for session to be ready before triggering data refreshes
 * - Session restoration handled by App.tsx (HttpOnly rehydration)
 * - Smart coordination between auth context and data providers
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
   * Coordinate data refresh when tab becomes visible again
   * v39.0: Session-aware - waits for session ready before triggering refreshes
   */
  private async coordinateRefresh() {
    if (this.isRefreshing) {
      console.warn("⚙️ Refresh already in progress, skipping");
      return;
    }

    // CRITICAL: Check if session is ready before proceeding
    if (this.sessionReadyCallback && !this.sessionReadyCallback()) {
      console.log('⏳ v39.0 - Session not ready yet, deferring refresh. Data providers will auto-fetch when ready.');
      return;
    }

    this.isRefreshing = true;
    const coordinatorStartTime = Date.now();
    console.log(`🔁 v39.0 - Coordinating data refresh (${this.refreshHandlers.length} handlers)...`);

    try {
      // Execute all data handlers in parallel
      // Auth/session restoration is handled by App.tsx rehydrateSessionFromServer
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
        console.log("✅ All data handlers completed");
      }
    } catch (error) {
      console.error("❌ Error during coordinated refresh", error);
    } finally {
      this.isRefreshing = false;
      const totalDuration = Date.now() - coordinatorStartTime;
      console.log(`✅ v39.0 - Coordinator complete in ${totalDuration}ms`);
    }
  }
}

export const visibilityCoordinator = new VisibilityCoordinator();
