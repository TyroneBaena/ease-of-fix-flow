/**
 * Tab Visibility Coordinator v41.0 - Enhanced Session Management
 *
 * CRITICAL: Now handles BOTH session restoration AND data refresh
 * - Calls App.tsx rehydrateSessionFromServer() on tab revisit
 * - Then triggers data provider refreshes
 * - Single source of truth for tab revisit workflow
 * - Eliminates race conditions from multiple event listeners
 * - v41.0: Static import + timeout protection + retry logic
 */

import { rehydrateSessionFromServer } from '@/App';

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
   * v41.0: Enhanced with timeout protection and retry logic
   */
  private async coordinateRefresh() {
    if (this.isRefreshing) {
      console.warn("⚙️ v41.0 - Refresh already in progress, skipping");
      return;
    }

    this.isRefreshing = true;
    const coordinatorStartTime = Date.now();
    console.log(`🔁 v41.0 - Starting coordinated tab revisit workflow...`);

    try {
      // STEP 1: Restore session from HttpOnly cookie with timeout protection
      console.log("📡 v41.0 - Step 1: Restoring session from server (with 30s timeout for cold starts)...");
      
      const restoreWithTimeout = async (): Promise<boolean> => {
        return Promise.race([
          rehydrateSessionFromServer(),
          new Promise<boolean>((resolve) => {
            setTimeout(() => {
              console.error("⏱️ v41.0 - Session restoration timeout after 30s (edge function cold start?)");
              resolve(false);
            }, 30000); // Increased to 30s to handle edge function cold starts
          })
        ]);
      };
      
      let restored = await restoreWithTimeout();
      
      // RETRY LOGIC: If first attempt fails, try once more with longer delay
      if (!restored) {
        console.warn("⚠️ v41.0 - First restoration attempt failed, retrying once (waiting 3s for cold start)...");
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3s for potential cold start
        restored = await restoreWithTimeout();
      }
      
      if (restored) {
        console.log("✅ v41.0 - Session restored successfully");
        
        // STEP 2: Wait for session to propagate to context
        console.log("⏳ v41.0 - Step 2: Waiting for session ready...");
        let attempts = 0;
        const maxAttempts = 20; // 2 seconds max wait (20 * 100ms)
        
        while (attempts < maxAttempts && this.sessionReadyCallback && !this.sessionReadyCallback()) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (this.sessionReadyCallback && this.sessionReadyCallback()) {
          console.log(`✅ v41.0 - Session ready after ${attempts * 100}ms`);
        } else {
          console.warn("⚠️ v41.0 - Session ready timeout, proceeding anyway");
        }
      } else {
        console.error("❌ v41.0 - Session restore failed after retry, skipping data refresh");
        console.error("💡 v41.0 - Check network tab for session endpoint errors");
        return;
      }

      // STEP 3: Execute all data refresh handlers in parallel
      console.log(`🔁 v41.0 - Step 3: Refreshing data (${this.refreshHandlers.length} handlers)...`);
      if (this.refreshHandlers.length > 0) {
        await Promise.all(
          this.refreshHandlers.map(async (handler) => {
            try {
              await handler();
            } catch (error) {
              console.error("❌ v41.0 - Handler error:", error);
            }
          })
        );
        console.log("✅ v41.0 - All data handlers completed");
      }
    } catch (error) {
      console.error("❌ v41.0 - Fatal error during coordinated refresh:", error);
      console.error("💡 v41.0 - This might indicate a network issue or edge function problem");
    } finally {
      this.isRefreshing = false;
      const totalDuration = Date.now() - coordinatorStartTime;
      console.log(`✅ v41.0 - Coordinator complete in ${totalDuration}ms`);
    }
  }
}

export const visibilityCoordinator = new VisibilityCoordinator();
