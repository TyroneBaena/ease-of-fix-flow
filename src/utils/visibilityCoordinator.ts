/**
 * Tab Visibility Coordinator v46.0 - Robust Sequential Flow
 *
 * APPROACH:
 * 1. Show loader on tab revisit
 * 2. Await session restoration (with proper error handling)
 * 3. Wait for session to be ready in context
 * 4. Trigger data refresh
 * 5. Hide loader
 * 
 * ERROR HANDLING:
 * - If session fails: redirect to login with clear message
 * - Prevent race conditions from rapid tab switches
 * - Debounce rapid visibility changes
 * 
 * EDGE CASES COVERED:
 * - Quick tab switches (< 1s)
 * - Long idle periods (hours)
 * - Multiple consecutive switches
 * - Expired session cookies
 */

import { rehydrateSessionFromServer } from '@/utils/sessionRehydration';
import { toast } from 'sonner';

type RefreshHandler = () => Promise<void | boolean> | void | boolean;
type ErrorHandler = (error: 'SESSION_EXPIRED' | 'SESSION_FAILED') => void;

class VisibilityCoordinator {
  private isRefreshing = false;
  private refreshHandlers: RefreshHandler[] = [];
  private isListening = false;
  private lastHiddenTime: number | null = null;
  private sessionReadyCallback: (() => boolean) | null = null;
  private debounceTimer: number | null = null;
  private consecutiveFailures = 0;
  
  // v46.0: Global tab refresh state for UI feedback
  private tabRefreshCallbacks: ((isRefreshing: boolean) => void)[] = [];
  private errorHandlers: ErrorHandler[] = [];
  
  /**
   * Subscribe to tab refresh state changes
   * Returns cleanup function
   */
  public onTabRefreshChange(callback: (isRefreshing: boolean) => void): () => void {
    this.tabRefreshCallbacks.push(callback);
    return () => {
      const index = this.tabRefreshCallbacks.indexOf(callback);
      if (index > -1) {
        this.tabRefreshCallbacks.splice(index, 1);
      }
    };
  }
  
  /**
   * Subscribe to error events
   * Returns cleanup function
   */
  public onError(callback: ErrorHandler): () => void {
    this.errorHandlers.push(callback);
    return () => {
      const index = this.errorHandlers.indexOf(callback);
      if (index > -1) {
        this.errorHandlers.splice(index, 1);
      }
    };
  }
  
  /**
   * Notify all subscribers of tab refresh state change
   */
  private notifyTabRefreshChange(isRefreshing: boolean) {
    this.tabRefreshCallbacks.forEach(callback => callback(isRefreshing));
  }
  
  /**
   * Notify all error handlers
   */
  private notifyError(error: 'SESSION_EXPIRED' | 'SESSION_FAILED') {
    this.errorHandlers.forEach(callback => callback(error));
  }

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
   * v46.0: Added debouncing and better error handling
   */
  private handleVisibilityChange = async () => {
    if (document.hidden) {
      this.lastHiddenTime = Date.now();
      console.log("🔒 v46.0 - Tab hidden at", new Date(this.lastHiddenTime).toISOString());
      
      // Clear any pending debounce timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
    } else {
      const now = Date.now();
      const hiddenDuration = this.lastHiddenTime ? now - this.lastHiddenTime : 0;

      console.log(`🔓 v46.0 - Tab visible again after ${hiddenDuration / 1000}s`);

      // v46.0: Debounce rapid visibility changes (< 500ms)
      // This prevents race conditions from quick tab switches
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      
      // Only debounce for quick switches (< 2s)
      if (hiddenDuration < 2000) {
        console.log("⏱️ v46.0 - Quick switch detected, debouncing...");
        this.debounceTimer = window.setTimeout(() => {
          this.coordinateRefresh();
          this.debounceTimer = null;
        }, 300); // 300ms debounce
      } else {
        // For longer periods, refresh immediately
        this.coordinateRefresh();
      }

      this.lastHiddenTime = null;
    }
  };

  /**
   * Coordinate session restoration + data refresh when tab becomes visible
   * v47.0: Fixed hanging setSession with timeout wrapper
   */
  private async coordinateRefresh() {
    if (this.isRefreshing) {
      console.warn("⚙️ v47.0 - Refresh already in progress, skipping");
      return;
    }

    this.isRefreshing = true;
    this.notifyTabRefreshChange(true); // 🎯 Notify UI: Show loader
    const startTime = Date.now();
    console.log(`🔁 v47.0 - Tab revisit: Starting robust workflow...`);

    try {
      // STEP 1: Restore session
      console.log("📡 v47.0 - Step 1: Restoring session from server...");
      const restored = await rehydrateSessionFromServer();
      
      if (!restored) {
        this.consecutiveFailures++;
        console.error(`❌ v47.0 - Session restoration failed (${this.consecutiveFailures} consecutive failures)`);
        
        // If this is a real session expiration, notify error handlers
        if (this.consecutiveFailures >= 2) {
          console.error("🚨 v47.0 - Multiple failures detected - session likely expired");
          toast.error("Your session has expired. Please log in again.", {
            duration: 5000,
            position: 'top-center'
          });
          this.notifyError('SESSION_EXPIRED');
        } else {
          console.warn("⚠️ v47.0 - First failure, will retry on next revisit");
          toast.warning("Session restoration failed. Please refresh the page if issues persist.", {
            duration: 4000
          });
          this.notifyError('SESSION_FAILED');
        }
        return;
      }
      
      // Reset failure counter on success
      this.consecutiveFailures = 0;
      console.log("✅ v47.0 - Session restored successfully");
      
      // STEP 2: Wait for session to propagate to React context
      console.log("⏳ v47.0 - Step 2: Waiting for session ready in context...");
      let attempts = 0;
      const maxAttempts = 30; // 3 seconds max (reduced from 5s)
      
      while (attempts < maxAttempts && this.sessionReadyCallback && !this.sessionReadyCallback()) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (this.sessionReadyCallback && this.sessionReadyCallback()) {
        console.log(`✅ v47.0 - Session ready in context after ${attempts * 100}ms`);
      } else {
        console.error("❌ v47.0 - Session ready timeout - context didn't update");
        toast.error("Session propagation timeout. Please refresh the page.");
        return;
      }
      
      // STEP 3: Trigger data refresh
      console.log(`🔁 v47.0 - Step 3: Refreshing data (${this.refreshHandlers.length} handlers)...`);
      if (this.refreshHandlers.length > 0) {
        await Promise.all(
          this.refreshHandlers.map(async (handler) => {
            try {
              await handler();
            } catch (err) {
              console.error("❌ v47.0 - Handler error:", err);
            }
          })
        );
      }
      
      const duration = Date.now() - startTime;
      console.log(`%c✅ v47.0 - Tab revisit complete in ${duration}ms`, "color: lime; font-weight: bold");
      
      // Show success feedback only for longer idle periods (> 30s)
      const hiddenDuration = this.lastHiddenTime ? startTime - this.lastHiddenTime : 0;
      if (hiddenDuration > 30000) {
        toast.success("Data refreshed", { duration: 2000 });
      }
    } catch (error) {
      console.error("❌ v47.0 - Fatal error during tab revisit:", error);
      toast.error("Failed to restore session. Please refresh the page.");
      this.notifyError('SESSION_FAILED');
    } finally {
      this.isRefreshing = false;
      this.notifyTabRefreshChange(false); // 🎯 Notify UI: Hide loader
    }
  }
}

export const visibilityCoordinator = new VisibilityCoordinator();
