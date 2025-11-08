/**
 * Tab Visibility Coordinator v74.0 - Guaranteed Soft Recovery on Tab Return
 *
 * ARCHITECTURAL CHANGE (v67.0):
 * ✅ Coordinator NO LONGER does session restoration itself
 * ✅ Handlers (like UnifiedAuthContext.refreshAuth) are responsible for session restoration
 * ✅ Coordinator only orchestrates handler execution with timeout protection
 * ✅ Eliminates duplicate session restoration calls
 * ✅ Fixes type mismatch bugs from v60.0
 *
 * CORE FLOW (v67.0):
 * 1. Tab visible → Trigger handler orchestration
 * 2. Run all registered handlers in parallel with isolation
 * 3. Each handler manages its own state (UnifiedAuthContext handles session restoration)
 * 4. Wait for all handlers to complete or timeout
 * 
 * FEATURES:
 * - Single source of truth for session restoration (UnifiedAuthContext)
 * - Handler isolation with allSettled
 * - No duplicate network calls
 * - Proper timeout handling per handler
 * - Clean separation of concerns
 */

import { supabaseClient } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { QueryClient } from '@tanstack/react-query';

type RefreshHandler = () => Promise<void | boolean> | void | boolean;
type ErrorHandler = (error: 'SESSION_EXPIRED' | 'SESSION_FAILED') => void;

// Feature flag: Enable auto-recovery from stuck loading states
const ENABLE_AUTO_RECOVERY = true;

class VisibilityCoordinator {
  private isRefreshing = false;
  private isCoordinating = false;
  private isRecovering = false;
  private refreshHandlers: RefreshHandler[] = [];
  private pendingHandlers: RefreshHandler[] = [];
  private isListening = false;
  private abortController: AbortController | null = null;
  private overallTimeoutId: NodeJS.Timeout | null = null; // v72.0: Track timeout to clear it
  private queryClient: QueryClient | null = null;
  
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
   * Set QueryClient for soft recovery operations
   */
  public setQueryClient(client: QueryClient) {
    this.queryClient = client;
    console.log("🔧 Watchdog - QueryClient registered for soft recovery");
  }

  /**
   * Get current recovery state
   */
  public getRecoveryState() {
    return this.isRecovering;
  }

  /**
   * v71.0: Get current refreshing state (for health monitor)
   */
  public getRefreshingState() {
    return this.isRefreshing;
  }

  /**
   * v74.0: Force reset coordinator state (called by soft recovery)
   * CRITICAL FIX: Clear the overall timeout to prevent zombie timers
   */
  public async forceReset() {
    console.log("🔧 v74.0 - Force resetting coordinator state");
    this.isRefreshing = false;
    this.isCoordinating = false;
    
    // v74.0: CRITICAL - Clear the overall timeout to stop zombie timers
    if (this.overallTimeoutId) {
      clearTimeout(this.overallTimeoutId);
      this.overallTimeoutId = null;
      console.log("✅ v74.0 - Cleared overall timeout (preventing zombie timer)");
    }
    
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    
    this.notifyTabRefreshChange(false);
    console.log("✅ v74.0 - Coordinator state reset");
  }

  /**
   * v74.0: Trigger refresh manually (called by health monitor during recovery)
   * This actually re-runs handlers to fetch fresh data
   * CRITICAL: Add delay to let previous coordination fully clean up
   */
  public async triggerRefresh() {
    console.log("🔧 v74.0 - Manually triggering refresh (with 500ms settle time)");
    // v74.0: Wait 500ms to let abort controller and timeouts fully clean up
    await new Promise(resolve => setTimeout(resolve, 500));
    await this.coordinateRefresh();
  }

  // v67.0: Removed setSessionReadyCallback - no longer needed
  // Session ready state is managed by UnifiedAuthContext

  /**
   * v54.0 - Register data refresh handler with proper cleanup and deduplication
   */
  public onRefresh(handler: RefreshHandler): () => void {
    // v54.0: Prevent duplicate handlers
    const alreadyRegistered = this.refreshHandlers.includes(handler);
    const alreadyPending = this.pendingHandlers.includes(handler);
    
    if (alreadyRegistered || alreadyPending) {
      console.warn(`⚠️ v54.0 - Handler already registered, skipping duplicate`);
      return () => {}; // Return no-op cleanup
    }
    
    // v54.0: Queue registration if coordination is active
    if (this.isCoordinating) {
      console.log(`📋 v54.0 - Queueing handler registration during coordination`);
      this.pendingHandlers.push(handler);
    } else {
      this.refreshHandlers.push(handler);
      console.log(`📝 v54.0 - Registered refresh handler (total: ${this.refreshHandlers.length})`);
    }

    // v54.0: CRITICAL FIX - Return cleanup that checks BOTH arrays
    // Handler can move from pending to refresh during coordination
    return () => {
      // Check and remove from pending handlers
      const pendingIndex = this.pendingHandlers.indexOf(handler);
      if (pendingIndex > -1) {
        this.pendingHandlers.splice(pendingIndex, 1);
        console.log(`🗑️ v54.0 - Removed from pending queue (remaining: ${this.pendingHandlers.length})`);
      }
      
      // Check and remove from active handlers
      const activeIndex = this.refreshHandlers.indexOf(handler);
      if (activeIndex > -1) {
        this.refreshHandlers.splice(activeIndex, 1);
        console.log(`🗑️ v54.0 - Unregistered refresh handler (remaining: ${this.refreshHandlers.length})`);
      }
      
      // Log if handler wasn't found in either array
      if (pendingIndex === -1 && activeIndex === -1) {
        console.warn(`⚠️ v54.0 - Handler not found in any array during cleanup`);
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
    console.log("👀 v74.0 - Started listening for tab visibility changes");
  }

  /**
   * Stop listening
   */
  public stopListening() {
    if (!this.isListening) return;
    this.isListening = false;
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    console.log("👀 v74.0 - Stopped listening");
  }

  /**
   * Handle tab becoming visible - v74.0: ALWAYS trigger soft recovery
   */
  private handleVisibilityChange = async () => {
    if (document.hidden) {
      console.log("🔒 v74.0 - Tab hidden");
      return;
    }

    console.log("🔓 v74.0 - Tab visible, triggering GUARANTEED soft recovery");
    
    // v74.0: ALWAYS do soft recovery on tab return - this guarantees fresh state
    await this.guaranteedSoftRecovery();
  };

  /**
   * v74.0: Guaranteed soft recovery on tab visibility
   * This ALWAYS runs when tab becomes visible, ensuring clean state
   */
  private async guaranteedSoftRecovery() {
    console.log("🔄 v74.0 - Starting GUARANTEED soft recovery...");
    
    try {
      // Step 1: Force reset coordinator (clear all timeouts and state)
      await this.forceReset();
      
      // Step 2: Cancel all pending React Query requests
      if (this.queryClient) {
        console.log("🔄 v74.0 - Canceling all pending queries...");
        await this.queryClient.cancelQueries();
      }
      
      // Step 3: Wait 500ms for cleanup to settle
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 4: Invalidate all queries to force fresh fetch
      if (this.queryClient) {
        console.log("🔄 v74.0 - Invalidating all queries...");
        await this.queryClient.invalidateQueries();
      }
      
      // Step 5: Trigger fresh coordination
      console.log("🔄 v74.0 - Triggering fresh coordination...");
      await this.coordinateRefresh();
      
      console.log("✅ v74.0 - GUARANTEED soft recovery complete");
    } catch (error) {
      console.error("❌ v74.0 - Soft recovery failed:", error);
      // Even if recovery fails, ensure we're not stuck
      await this.forceReset();
    }
  }

  /**
   * v74.0 - DEPRECATED: Soft recovery now happens automatically on tab visibility
   * This method kept for backwards compatibility but does nothing
   */
  public async softRecovery() {
    console.log("⚠️ v74.0 - softRecovery() deprecated, now automatic on tab return");
  }

  /**
   * v74.0 - Internal recovery for session validation only
   */
  private async validateSession() {
    console.log("🔧 v74.0 - Validating session...");

    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      if (error) {
        console.error("❌ v74.0 - Session validation failed:", error);
        this.notifyError('SESSION_FAILED');
      } else if (session) {
        console.log("✅ v74.0 - Session valid");
      } else {
        console.warn("⚠️ v74.0 - No active session");
        this.notifyError('SESSION_EXPIRED');
      }
    } catch (err) {
      console.error("❌ v74.0 - Session validation error:", err);
    }
  }

  /**
   * v74.0 - Coordinate all refresh handlers
   * Integrated with independent ApplicationHealthMonitor
   * CRITICAL FIX: Store timeout ID so it can be cleared during force reset
   */
  private async coordinateRefresh() {
    if (this.isRefreshing) {
      console.warn("⚙️ v74.0 - Refresh already in progress, skipping");
      return;
    }

    this.isCoordinating = true;
    this.isRefreshing = true;
    this.notifyTabRefreshChange(true);
    const startTime = Date.now();
    console.log("🔁 v74.0 - Starting coordination (monitored by ApplicationHealthMonitor)");

    this.abortController = new AbortController();

    // v74.0: Store timeout ID so it can be cleared in forceReset()
    const overallTimeout = new Promise((_, reject) => {
      this.overallTimeoutId = setTimeout(() => {
        console.error("🚨 v74.0 - Overall timeout reached after 60s");
        this.abortController?.abort();
        reject(new Error('Overall coordination timeout'));
      }, 60000);
    });

    try {
      await Promise.race([
        this.executeHandlers(),
        overallTimeout
      ]);
      
      const duration = Date.now() - startTime;
      console.log(`%c✅ v74.0 - Coordination complete in ${duration}ms`, "color: lime; font-weight: bold");
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ v74.0 - Coordination failed after ${duration}ms:`, error);
      toast.error("Some data may not have loaded. Please refresh if needed.");
    } finally {
      // v74.0: Clear the timeout ID
      if (this.overallTimeoutId) {
        clearTimeout(this.overallTimeoutId);
        this.overallTimeoutId = null;
      }
      // Process pending handlers
      if (this.pendingHandlers.length > 0) {
        console.log(`📋 v74.0 - Processing ${this.pendingHandlers.length} pending handlers`);
        const handlersToProcess = [...this.pendingHandlers];
        this.pendingHandlers = [];
        
        handlersToProcess.forEach(handler => {
          if (!this.refreshHandlers.includes(handler)) {
            this.refreshHandlers.push(handler);
          }
        });
      }
      
      this.isCoordinating = false;
      this.isRefreshing = false;
      this.abortController = null;
      this.notifyTabRefreshChange(false);
    }
  }

  /**
   * v74.0 - Simplified: Just run handlers with timeout protection
   * Session restoration is handled by UnifiedAuthContext.refreshAuth handler
   */
  private async executeHandlers() {
    console.log("═══════════════════════════════════════════════════");
    console.log(`🔁 v74.0 - Running ${this.refreshHandlers.length} handlers...`);
    console.log("═══════════════════════════════════════════════════");
    
    if (this.refreshHandlers.length === 0) {
      console.warn("⚠️ v74.0 - No handlers registered");
      return;
    }
    
    const handlerTimeout = 30000; // 30s per handler
    const handlerPromises = this.refreshHandlers.map(async (handler, index) => {
      const handlerStart = Date.now();
      console.log(`▶️ v74.0 - Handler ${index + 1} starting...`);
      
      try {
        if (this.abortController?.signal.aborted) {
          console.warn(`⚠️ v74.0 - Handler ${index + 1} aborted`);
          return;
        }
        
        await Promise.race([
          handler(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Handler timeout')), handlerTimeout)
          )
        ]);
        
        const duration = Date.now() - handlerStart;
        console.log(`✅ v74.0 - Handler ${index + 1} done in ${duration}ms`);
      } catch (err) {
        const duration = Date.now() - handlerStart;
        console.error(`❌ v74.0 - Handler ${index + 1} failed after ${duration}ms:`, err);
      }
    });
    
    const results = await Promise.allSettled(handlerPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log("═══════════════════════════════════════════════════");
    console.log(`✅ v74.0 - Handlers complete: ${successful} ok, ${failed} failed`);
    console.log("═══════════════════════════════════════════════════");
  }
}

export const visibilityCoordinator = new VisibilityCoordinator();
