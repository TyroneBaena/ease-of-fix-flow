/**
 * Tab Visibility Coordinator v53.0 - Handler Queueing During Coordination
 *
 * CRITICAL FIXES:
 * 1. Handlers queue during coordination instead of being blocked
 * 2. Queued handlers are registered after coordination completes
 * 3. Prevents handler loss from unmount/remount cycles during session restoration
 * 4. Data fetch callbacks now check for currentUser to prevent errors
 *
 * CORE FLOW:
 * 1. Tab visible → Show loader
 * 2. Set coordination lock (prevents handler re-registration)
 * 3. Restore session on app's singleton client
 * 4. Wait for session ready in React context
 * 5. Trigger data refresh handlers
 * 6. Release coordination lock
 * 7. Hide loader
 * 
 * FEATURES:
 * - Coordination lock prevents handler re-registration during restore
 * - Stable handler callbacks (session check inside, not in deps)
 * - Single restore operation at a time (no race conditions)
 * - Overall timeout protection (20s)
 * - Proper handler cleanup to prevent accumulation
 * - Session expiration detection
 */

import { rehydrateSessionFromServer } from '@/utils/sessionRehydration';
import { toast } from 'sonner';

type RefreshHandler = () => Promise<void | boolean> | void | boolean;
type ErrorHandler = (error: 'SESSION_EXPIRED' | 'SESSION_FAILED') => void;

class VisibilityCoordinator {
  private isRefreshing = false;
  private isCoordinating = false;
  private refreshHandlers: RefreshHandler[] = [];
  private pendingHandlers: RefreshHandler[] = []; // v53.0: Queue handlers during coordination
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
    console.log('📝 v50.0 - Session ready callback registered');
  }

  /**
   * v53.0 - Register data refresh handler with queueing during coordination
   */
  public onRefresh(handler: RefreshHandler): () => void {
    // v53.0: Queue registration if coordination is active
    if (this.isCoordinating) {
      console.log(`📋 v53.0 - Queueing handler registration during coordination`);
      this.pendingHandlers.push(handler);
      
      // Return cleanup that removes from pending queue
      return () => {
        const pendingIndex = this.pendingHandlers.indexOf(handler);
        if (pendingIndex > -1) {
          this.pendingHandlers.splice(pendingIndex, 1);
          console.log(`🗑️ v53.0 - Removed from pending queue`);
        }
      };
    }
    
    this.refreshHandlers.push(handler);
    console.log(`📝 v53.0 - Registered refresh handler (total: ${this.refreshHandlers.length})`);

    // Return cleanup function that removes THIS specific handler
    return () => {
      const index = this.refreshHandlers.indexOf(handler);
      if (index > -1) {
        this.refreshHandlers.splice(index, 1);
        console.log(`🗑️ v53.0 - Unregistered refresh handler (remaining: ${this.refreshHandlers.length})`);
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
    console.log("👀 v50.0 - Started listening for tab visibility changes");
  }

  /**
   * Stop listening
   */
  public stopListening() {
    if (!this.isListening) return;
    this.isListening = false;
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    console.log("👀 v50.0 - Stopped listening");
  }

  /**
   * Handle tab becoming visible
   */
  private handleVisibilityChange = async () => {
    if (document.hidden) {
      console.log("🔒 v50.0 - Tab hidden");
      return;
    }

    console.log("🔓 v50.0 - Tab visible, triggering refresh");
    this.coordinateRefresh();
  };

  /**
   * v53.0 - Main coordination logic with handler queueing
   */
  private async coordinateRefresh() {
    // Prevent overlapping restores
    if (this.isRefreshing) {
      console.warn("⚙️ v53.0 - Refresh already in progress, skipping");
      return;
    }

    // v53.0: Set coordination lock and show loader
    this.isCoordinating = true;
    this.isRefreshing = true;
    this.notifyTabRefreshChange(true);
    const startTime = Date.now();
    console.log("🔁 v53.0 - Starting tab revisit workflow with handler queueing");

    // Overall timeout for entire flow (20 seconds)
    const overallTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Overall coordination timeout')), 20000)
    );

    try {
      await Promise.race([
        this.executeRefreshFlow(),
        overallTimeout
      ]);
      
      const duration = Date.now() - startTime;
      console.log(`%c✅ v53.0 - Tab revisit complete in ${duration}ms`, "color: lime; font-weight: bold");
      toast.success("Data refreshed", { duration: 2000 });
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ v53.0 - Coordination failed after ${duration}ms:`, error);
      
      if (error.message === 'Overall coordination timeout') {
        console.error("🚨 v53.0 - Overall timeout reached");
        toast.error("Session restoration timeout. Please refresh the page.");
      } else {
        toast.error("Failed to restore session. Please refresh the page.");
      }
      
      this.notifyError('SESSION_FAILED');
    } finally {
      // v53.0: Process pending handlers BEFORE releasing lock
      if (this.pendingHandlers.length > 0) {
        console.log(`📋 v53.0 - Processing ${this.pendingHandlers.length} pending handlers`);
        this.pendingHandlers.forEach(handler => {
          this.refreshHandlers.push(handler);
          console.log(`📝 v53.0 - Registered pending handler (total: ${this.refreshHandlers.length})`);
        });
        this.pendingHandlers = [];
      }
      
      // v53.0: Release coordination lock
      this.isCoordinating = false;
      this.isRefreshing = false;
      this.notifyTabRefreshChange(false);
    }
  }

  /**
   * v53.0 - Execute the refresh flow steps
   */
  private async executeRefreshFlow() {
    // STEP 1: Restore session on singleton client
    console.log("📡 v53.0 - Step 1: Restoring session...");
    const restored = await rehydrateSessionFromServer();
    
    if (!restored) {
      this.consecutiveFailures++;
      console.error(`❌ v53.0 - Session restoration failed (failures: ${this.consecutiveFailures})`);
      
      if (this.consecutiveFailures >= 2) {
        console.error("🚨 v53.0 - Session expired after multiple failures");
        toast.error("Your session has expired. Please log in again.", {
          duration: 5000,
          position: 'top-center'
        });
        this.notifyError('SESSION_EXPIRED');
      } else {
        toast.warning("Session restoration failed. Retrying on next visit.", {
          duration: 4000
        });
        this.notifyError('SESSION_FAILED');
      }
      throw new Error('Session restoration failed');
    }
    
    this.consecutiveFailures = 0;
    console.log("✅ v53.0 - Session restored successfully");
    
    // STEP 2: Wait for session ready in React context
    console.log("⏳ v53.0 - Step 2: Waiting for auth listener to complete...");
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max for auth listener
    
    while (attempts < maxAttempts && this.sessionReadyCallback && !this.sessionReadyCallback()) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (this.sessionReadyCallback && this.sessionReadyCallback()) {
      console.log(`✅ v53.0 - Auth listener completed after ${attempts * 100}ms`);
    } else {
      console.error("❌ v53.0 - Auth listener timeout after 10s");
      throw new Error('Auth listener timeout');
    }
    
    // STEP 3: Trigger data refresh handlers
    console.log(`🔁 v53.0 - Step 3: Running refresh handlers (${this.refreshHandlers.length} registered)`);
    if (this.refreshHandlers.length > 0) {
      await Promise.all(
        this.refreshHandlers.map(async (handler, index) => {
          try {
            console.log(`🔁 v53.0 - Running handler ${index + 1}/${this.refreshHandlers.length}`);
            await handler();
          } catch (err) {
            console.error(`❌ v53.0 - Handler ${index + 1} error:`, err);
          }
        })
      );
    } else {
      console.warn("⚠️ v53.0 - No handlers registered to run!");
    }
    
    console.log("✅ v53.0 - All refresh handlers completed");
  }
}

export const visibilityCoordinator = new VisibilityCoordinator();
