/**
 * Tab Visibility Coordinator v5.0
 *
 * Handles safe data refresh when user revisits the tab.
 * - No forced reload (prevents logout or data loss)
 * - Coordinates refresh across registered data providers
 * - Executes refreshes immediately without blocking
 */

type RefreshHandler = () => Promise<void> | void;

class VisibilityCoordinator {
  private isRefreshing = false;
  private refreshHandlers: RefreshHandler[] = [];
  private isListening = false;
  private lastHiddenTime: number | null = null;

  /**
   * Register a handler to run when refreshing data on tab visibility change
   */
  public onRefresh(handler: RefreshHandler) {
    this.refreshHandlers.push(handler);
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
   * Executes all refresh handlers in parallel for faster loading
   */
  private async coordinateRefresh() {
    if (this.isRefreshing) {
      console.log("⚙️ Refresh already in progress — skipping duplicate refresh");
      return;
    }

    this.isRefreshing = true;
    console.log("🔁 Coordinating refresh across tabs...");

    try {
      // Execute all refresh handlers in parallel for faster loading
      await Promise.all(this.refreshHandlers.map(handler => handler()));
      console.log("✅ All refresh handlers completed successfully");
    } catch (error) {
      console.error("❌ Error during coordinated refresh", error);
    } finally {
      this.isRefreshing = false;
    }
  }
}

export const visibilityCoordinator = new VisibilityCoordinator();
