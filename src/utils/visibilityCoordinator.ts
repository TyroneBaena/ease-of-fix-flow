/**
 * Tab Visibility Coordinator v48.0 - Clean & Simple
 *
 * CORE FLOW:
 * 1. Tab visible → Show loader
 * 2. Restore session from backend
 * 3. Wait for session ready in React context
 * 4. Trigger data refresh handlers
 * 5. Hide loader
 * 
 * FEATURES:
 * - Single restore operation at a time (no race conditions)
 * - Clean error handling with user feedback
 * - Session expiration detection
 * - Simple, sequential logic
 */

import { rehydrateSessionFromServer } from '@/utils/sessionRehydration';
import { toast } from 'sonner';

type RefreshHandler = () => Promise<void | boolean> | void | boolean;
type ErrorHandler = (error: 'SESSION_EXPIRED' | 'SESSION_FAILED') => void;

class VisibilityCoordinator {
  private isRefreshing = false;
  private refreshHandlers: RefreshHandler[] = [];
  private isListening = false;
  private sessionReadyCallback: (() => boolean) | null = null;
  private consecutiveFailures = 0;
  
  // UI feedback callbacks
  private tabRefreshCallbacks: ((isRefreshing: boolean) => void)[] = [];
  private errorHandlers: ErrorHandler[] = [];
  
  /**
   * Subscribe to tab refresh state changes (for showing loaders)
   */
  public onTabRefreshChange(callback: (isRefreshing: boolean) => void): () => void {
    this.tabRefreshCallbacks.push(callback);
    return () => {
      const index = this.tabRefreshCallbacks.indexOf(callback);
      if (index > -1) this.tabRefreshCallbacks.splice(index, 1);
    };
  }
  
  /**
   * Subscribe to session errors (for redirecting to login)
   */
  public onError(callback: ErrorHandler): () => void {
    this.errorHandlers.push(callback);
    return () => {
      const index = this.errorHandlers.indexOf(callback);
      if (index > -1) this.errorHandlers.splice(index, 1);
    };
  }
  
  private notifyTabRefreshChange(isRefreshing: boolean) {
    this.tabRefreshCallbacks.forEach(callback => callback(isRefreshing));
  }
  
  private notifyError(error: 'SESSION_EXPIRED' | 'SESSION_FAILED') {
    this.errorHandlers.forEach(callback => callback(error));
  }

  /**
   * Set callback to check if session is ready in React context
   */
  public setSessionReadyCallback(callback: () => boolean) {
    this.sessionReadyCallback = callback;
    console.log('📝 v48.0 - Session ready callback registered');
  }

  /**
   * Register data refresh handler
   */
  public onRefresh(handler: RefreshHandler): () => void {
    if (!this.refreshHandlers.includes(handler)) {
      this.refreshHandlers.push(handler);
      console.log(`📝 v48.0 - Registered refresh handler (total: ${this.refreshHandlers.length})`);
    }

    return () => {
      const index = this.refreshHandlers.indexOf(handler);
      if (index > -1) {
        this.refreshHandlers.splice(index, 1);
        console.log(`🗑️ v48.0 - Unregistered refresh handler (remaining: ${this.refreshHandlers.length})`);
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
    console.log("👀 v48.0 - Started listening for tab visibility changes");
  }

  /**
   * Stop listening
   */
  public stopListening() {
    if (!this.isListening) return;
    this.isListening = false;
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    console.log("👀 v48.0 - Stopped listening");
  }

  /**
   * Handle tab becoming visible
   */
  private handleVisibilityChange = async () => {
    if (document.hidden) {
      console.log("🔒 v48.0 - Tab hidden");
      return;
    }

    console.log("🔓 v48.0 - Tab visible, triggering refresh");
    this.coordinateRefresh();
  };

  /**
   * Main coordination logic
   */
  private async coordinateRefresh() {
    // Prevent overlapping restores
    if (this.isRefreshing) {
      console.warn("⚙️ v48.0 - Refresh already in progress, skipping");
      return;
    }

    this.isRefreshing = true;
    this.notifyTabRefreshChange(true); // Show loader
    const startTime = Date.now();
    console.log("🔁 v48.0 - Starting tab revisit workflow");

    try {
      // STEP 1: Restore session
      console.log("📡 v48.0 - Step 1: Restoring session...");
      const restored = await rehydrateSessionFromServer();
      
      if (!restored) {
        this.consecutiveFailures++;
        console.error(`❌ v48.0 - Session restoration failed (failures: ${this.consecutiveFailures})`);
        
        if (this.consecutiveFailures >= 2) {
          console.error("🚨 v48.0 - Session expired");
          toast.error("Your session has expired. Please log in again.", {
            duration: 5000,
            position: 'top-center'
          });
          this.notifyError('SESSION_EXPIRED');
        } else {
          toast.warning("Session restoration failed. Please refresh if issues persist.", {
            duration: 4000
          });
          this.notifyError('SESSION_FAILED');
        }
        return;
      }
      
      this.consecutiveFailures = 0;
      console.log("✅ v48.0 - Session restored");
      
      // STEP 2: Wait for session ready in React context
      console.log("⏳ v48.0 - Step 2: Waiting for session ready...");
      let attempts = 0;
      const maxAttempts = 30; // 3 seconds max
      
      while (attempts < maxAttempts && this.sessionReadyCallback && !this.sessionReadyCallback()) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (this.sessionReadyCallback && this.sessionReadyCallback()) {
        console.log(`✅ v48.0 - Session ready after ${attempts * 100}ms`);
      } else {
        console.error("❌ v48.0 - Session ready timeout");
        toast.error("Session propagation timeout. Please refresh.");
        return;
      }
      
      // STEP 3: Trigger data refresh
      console.log(`🔁 v48.0 - Step 3: Refreshing data (${this.refreshHandlers.length} handlers)`);
      if (this.refreshHandlers.length > 0) {
        await Promise.all(
          this.refreshHandlers.map(async (handler) => {
            try {
              await handler();
            } catch (err) {
              console.error("❌ v48.0 - Handler error:", err);
            }
          })
        );
      }
      
      const duration = Date.now() - startTime;
      console.log(`%c✅ v48.0 - Tab revisit complete in ${duration}ms`, "color: lime; font-weight: bold");
      toast.success("Data refreshed", { duration: 2000 });
      
    } catch (error) {
      console.error("❌ v48.0 - Fatal error:", error);
      toast.error("Failed to restore session. Please refresh the page.");
      this.notifyError('SESSION_FAILED');
    } finally {
      this.isRefreshing = false;
      this.notifyTabRefreshChange(false); // Hide loader
    }
  }
}

export const visibilityCoordinator = new VisibilityCoordinator();
