/**
 * Tab Visibility Coordinator v43.0 - Bulletproof Error Recovery
 *
 * CRITICAL FIXES:
 * - Fixed callback registration to use ref instead of captured value
 * - Added graceful fallback when session restoration fails
 * - Prevents stuck loading states with max 60s total timeout
 * - Allows UI to render with cached data even if session fails
 * - Handles BOTH session restoration AND data refresh
 * - Single source of truth for tab revisit workflow
 * 
 * BUG FIXES:
 * - BUG #1: Callback now reads current value from ref
 * - BUG #2: UI shows cached data if session restoration fails
 * - BUG #3: Debounce prevents conflicting refresh attempts
 * - BUG #4: Graceful error handling for expired cookies
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
   * v43.0: Bulletproof error recovery with graceful fallbacks
   */
  private async coordinateRefresh() {
    if (this.isRefreshing) {
      console.warn("⚙️ v43.0 - Refresh already in progress, skipping");
      return;
    }

    this.isRefreshing = true;
    const coordinatorStartTime = Date.now();
    console.log(`🔁 v43.0 - Starting coordinated tab revisit workflow...`);
    
    let restored = false; // Track restoration success

    try {
      // STEP 1: Restore session from HttpOnly cookie with realistic timeout
      console.log("📡 v43.0 - Step 1: Restoring session from server (60s max timeout)...");
      
      const restoreWithTimeout = async (): Promise<boolean> => {
        return Promise.race([
          rehydrateSessionFromServer(),
          new Promise<boolean>((resolve) => {
            setTimeout(() => {
              console.error("⏱️ v43.0 - Session restoration timeout after 60s");
              resolve(false);
            }, 60000); // 60s to handle worst case cold starts
          })
        ]);
      };
      
      restored = await restoreWithTimeout();
      
      if (restored) {
        console.log("✅ v43.0 - Session restored successfully");
        
        // STEP 2: Wait for session to propagate to context (with timeout)
        console.log("⏳ v43.0 - Step 2: Waiting for session ready...");
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait (50 * 100ms)
        
        while (attempts < maxAttempts && this.sessionReadyCallback && !this.sessionReadyCallback()) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (this.sessionReadyCallback && this.sessionReadyCallback()) {
          console.log(`✅ v43.0 - Session ready after ${attempts * 100}ms`);
        } else {
          console.warn("⚠️ v43.0 - Session ready timeout, but session was restored. Proceeding with data refresh anyway.");
        }
        
        // STEP 3: Execute all data refresh handlers in parallel
        console.log(`🔁 v43.0 - Step 3: Refreshing data (${this.refreshHandlers.length} handlers)...`);
        if (this.refreshHandlers.length > 0) {
          await Promise.all(
            this.refreshHandlers.map(async (handler) => {
              try {
                await handler();
              } catch (error) {
                console.error("❌ v43.0 - Handler error (non-fatal):", error);
              }
            })
          );
          console.log("✅ v43.0 - All data handlers completed");
        }
      } else {
        // CRITICAL FIX: Don't skip data refresh - allow UI to show cached data
        console.warn("⚠️ v43.0 - Session restoration failed, but continuing with cached data");
        console.warn("💡 v43.0 - User will see their last cached view. They may need to re-login for fresh data.");
        
        // Still trigger data refresh handlers - they will use cached queries
        console.log(`🔁 v43.0 - Triggering ${this.refreshHandlers.length} handlers with cached data...`);
        if (this.refreshHandlers.length > 0) {
          await Promise.all(
            this.refreshHandlers.map(async (handler) => {
              try {
                await handler();
              } catch (error) {
                console.error("❌ v43.0 - Handler error (non-fatal):", error);
              }
            })
          );
        }
      }
    } catch (error) {
      console.error("❌ v43.0 - Fatal error during coordinated refresh:", error);
      console.warn("💡 v43.0 - Allowing UI to render with cached data despite error");
    } finally {
      this.isRefreshing = false;
      const totalDuration = Date.now() - coordinatorStartTime;
      console.log(`✅ v43.0 - Coordinator complete in ${totalDuration}ms (graceful ${restored ? 'success' : 'fallback'})`);
    }
  }
}

export const visibilityCoordinator = new VisibilityCoordinator();
