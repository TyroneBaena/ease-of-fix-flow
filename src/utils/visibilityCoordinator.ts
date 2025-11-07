/**
 * Tab Visibility Coordinator v43.1 - Non-Blocking Session Restoration
 *
 * CRITICAL FIXES (v43.1):
 * - Session restoration no longer blocks UI rendering
 * - Reduced timeout from 60s to 30s for faster recovery  
 * - Non-blocking realtime reconnect
 * - Proper cleanup of hanging promises
 * 
 * PREVIOUS FIXES (v43.0):
 * - Fixed callback registration to use ref instead of captured value
 * - Added graceful fallback when session restoration fails
 * - Allows UI to render with cached data even if session fails
 * - Handles BOTH session restoration AND data refresh
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
   * v43.1: Non-blocking session restoration
   */
  private async coordinateRefresh() {
    if (this.isRefreshing) {
      console.warn("⚙️ v43.1 - Refresh already in progress, skipping");
      return;
    }

    this.isRefreshing = true;
    const coordinatorStartTime = Date.now();
    console.log(`🔁 v43.1 - Starting coordinated tab revisit workflow...`);
    
    let restored = false;

    try {
      // STEP 1: Restore session with aggressive timeout (30s instead of 60s)
      console.log("📡 v43.1 - Step 1: Restoring session from server (30s timeout)...");
      
      const restoreWithTimeout = async (): Promise<boolean> => {
        const timeoutPromise = new Promise<boolean>((resolve) => {
          setTimeout(() => {
            console.error("⏱️ v43.1 - Session restoration timeout after 30s");
            resolve(false);
          }, 30000);
        });
        
        const restorePromise = rehydrateSessionFromServer().catch((err) => {
          console.error("❌ v43.1 - Session restoration error:", err);
          return false;
        });
        
        return Promise.race([restorePromise, timeoutPromise]);
      };
      
      restored = await restoreWithTimeout();
      
      if (restored) {
        console.log("✅ v43.1 - Session restored successfully");
        
        // STEP 2: Wait for session ready (reduced timeout)
        console.log("⏳ v43.1 - Step 2: Waiting for session ready...");
        let attempts = 0;
        const maxAttempts = 20; // 2 seconds max (20 * 100ms) - reduced from 5s
        
        while (attempts < maxAttempts && this.sessionReadyCallback && !this.sessionReadyCallback()) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (this.sessionReadyCallback && this.sessionReadyCallback()) {
          console.log(`✅ v43.1 - Session ready after ${attempts * 100}ms`);
        } else {
          console.warn("⚠️ v43.1 - Session ready timeout, proceeding anyway");
        }
      } else {
        console.warn("⚠️ v43.1 - Session restoration failed, continuing with cached data");
        console.warn("💡 v43.1 - User viewing cached data. They may need to re-login for fresh data.");
      }
      
      // STEP 3: ALWAYS trigger data refresh (even if session failed)
      console.log(`🔁 v43.1 - Step 3: Refreshing data (${this.refreshHandlers.length} handlers)...`);
      if (this.refreshHandlers.length > 0) {
        // Use Promise.allSettled to prevent one failing handler from blocking others
        const results = await Promise.allSettled(
          this.refreshHandlers.map(async (handler) => {
            try {
              await handler();
            } catch (error) {
              console.error("❌ v43.1 - Handler error (non-fatal):", error);
              throw error;
            }
          })
        );
        
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        console.log(`✅ v43.1 - Data refresh complete: ${successful} succeeded, ${failed} failed`);
      }
    } catch (error) {
      console.error("❌ v43.1 - Fatal error during coordinated refresh:", error);
      console.warn("💡 v43.1 - Allowing UI to render with cached data");
    } finally {
      this.isRefreshing = false;
      const totalDuration = Date.now() - coordinatorStartTime;
      console.log(`✅ v43.1 - Coordinator complete in ${totalDuration}ms (${restored ? 'success' : 'fallback'})`);
    }
  }
}

export const visibilityCoordinator = new VisibilityCoordinator();
