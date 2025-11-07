/**
 * Tab Visibility Coordinator v44.0 - Simple Sequential Flow
 *
 * SIMPLIFIED APPROACH:
 * 1. Show loader on tab revisit
 * 2. Await session restoration (no timeout, just wait)
 * 3. Wait for session to be ready in context
 * 4. Trigger data refresh
 * 5. Hide loader
 * 
 * NO MORE:
 * - Complex timeout logic
 * - "Cached data" fallbacks
 * - Race conditions
 * - Retry attempts
 * 
 * If session fails = show error, don't pretend cached data works
 */

import { rehydrateSessionFromServer } from '@/utils/sessionRehydration';

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
   * v44.0: Simple sequential flow - no timeouts, no fallbacks
   */
  private async coordinateRefresh() {
    if (this.isRefreshing) {
      console.warn("⚙️ v44.0 - Refresh already in progress, skipping");
      return;
    }

    this.isRefreshing = true;
    const startTime = Date.now();
    console.log(`🔁 v44.0 - Tab revisit: Starting simple sequential workflow...`);

    try {
      // STEP 1: Restore session - just wait for it, no timeout
      console.log("📡 v44.0 - Step 1: Restoring session from server...");
      const restored = await rehydrateSessionFromServer();
      
      if (!restored) {
        console.error("❌ v44.0 - Session restoration failed");
        console.error("💡 v44.0 - This is a real error - session endpoint returned null or failed");
        // Don't proceed - without session, queries will fail anyway
        return;
      }
      
      console.log("✅ v44.0 - Session restored successfully");
      
      // STEP 2: Wait for session to propagate to React context
      console.log("⏳ v44.0 - Step 2: Waiting for session ready in context...");
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max
      
      while (attempts < maxAttempts && this.sessionReadyCallback && !this.sessionReadyCallback()) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (this.sessionReadyCallback && this.sessionReadyCallback()) {
        console.log(`✅ v44.0 - Session ready in context after ${attempts * 100}ms`);
      } else {
        console.error("❌ v44.0 - Session ready timeout - context didn't update");
        return;
      }
      
      // STEP 3: Trigger data refresh - queries will use valid session
      console.log(`🔁 v44.0 - Step 3: Refreshing data (${this.refreshHandlers.length} handlers)...`);
      if (this.refreshHandlers.length > 0) {
        await Promise.all(
          this.refreshHandlers.map(async (handler) => {
            try {
              await handler();
            } catch (err) {
              console.error("❌ v44.0 - Handler error:", err);
            }
          })
        );
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ v44.0 - Tab revisit complete in ${duration}ms`);
    } catch (error) {
      console.error("❌ v44.0 - Fatal error during tab revisit:", error);
    } finally {
      this.isRefreshing = false;
    }
  }
}

export const visibilityCoordinator = new VisibilityCoordinator();
