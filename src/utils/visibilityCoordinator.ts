/**
 * Tab Visibility Coordinator v67.0 - Simplified Handler Orchestration
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
   * v70.0: Get current refreshing state (for health monitor)
   */
  public getRefreshingState() {
    return this.isRefreshing;
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
    console.log("👀 v67.0 - Started listening for tab visibility changes");
  }

  /**
   * Stop listening
   */
  public stopListening() {
    if (!this.isListening) return;
    this.isListening = false;
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    console.log("👀 v67.0 - Stopped listening");
  }

  /**
   * Handle tab becoming visible
   */
  private handleVisibilityChange = async () => {
    if (document.hidden) {
      console.log("🔒 v67.0 - Tab hidden");
      return;
    }

    console.log("🔓 v70.0 - Tab visible, triggering handler orchestration");
    this.coordinateRefresh();
  };

  /**
   * v70.0 - Soft Recovery: Reset stuck states and re-fetch data
   * Called by ApplicationHealthMonitor when loading state exceeds threshold
   */
  public async softRecovery() {
    if (!ENABLE_AUTO_RECOVERY) {
      console.warn("🚨 v70.0 - Auto-recovery is disabled");
      return;
    }

    if (this.isRecovering) {
      console.warn("🚨 v70.0 - Recovery already in progress, skipping");
      return;
    }

    this.isRecovering = true;
    const recoveryStart = Date.now();
    console.log("═══════════════════════════════════════════════════");
    console.log("🚨 v70.0 - STUCK STATE DETECTED! Starting soft recovery...");
    console.log("═══════════════════════════════════════════════════");

    try {
      // Step 1: Force reset loading states
      console.log("🔧 v70.0 - Step 1: Forcing isRefreshing = false");
      this.isRefreshing = false;
      this.isCoordinating = false;
      this.notifyTabRefreshChange(false);

      // Step 2: Clear abort controllers
      console.log("🔧 v70.0 - Step 2: Clearing abort controllers");
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }

      // Step 3: React Query recovery
      if (this.queryClient) {
        console.log("🔧 v70.0 - Step 3: React Query recovery (cancel + invalidate + refetch)");
        
        // Cancel all ongoing queries
        await this.queryClient.cancelQueries();
        console.log("   ✅ Canceled all queries");
        
        // Invalidate all queries to mark as stale
        await this.queryClient.invalidateQueries();
        console.log("   ✅ Invalidated all queries");
        
        // Refetch all active queries
        await this.queryClient.refetchQueries({ type: 'active' });
        console.log("   ✅ Refetched active queries");
      } else {
        console.warn("⚠️ v70.0 - QueryClient not available, skipping React Query recovery");
      }

      // Step 4: Re-validate session
      console.log("🔧 v70.0 - Step 4: Re-validating session");
      try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) {
          console.error("❌ v70.0 - Session validation failed:", error);
          this.notifyError('SESSION_FAILED');
        } else if (session) {
          console.log("   ✅ Session valid");
        } else {
          console.warn("   ⚠️ No active session");
          this.notifyError('SESSION_EXPIRED');
        }
      } catch (err) {
        console.error("❌ v70.0 - Session validation error:", err);
      }

      const recoveryDuration = Date.now() - recoveryStart;
      console.log("═══════════════════════════════════════════════════");
      console.log(`✅ v70.0 - Soft recovery complete in ${recoveryDuration}ms`);
      console.log("═══════════════════════════════════════════════════");

    } catch (error: any) {
      const recoveryDuration = Date.now() - recoveryStart;
      console.error(`❌ v70.0 - Recovery failed after ${recoveryDuration}ms:`, error);
      toast.error("Recovery failed. Please refresh the page manually.");
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * v69.0 - Coordinate all refresh handlers
   * Integrated with independent ApplicationHealthMonitor
   */
  private async coordinateRefresh() {
    if (this.isRefreshing) {
      console.warn("⚙️ v69.0 - Refresh already in progress, skipping");
      return;
    }

    this.isCoordinating = true;
    this.isRefreshing = true;
    this.notifyTabRefreshChange(true);
    const startTime = Date.now();
    console.log("🔁 v70.0 - Starting tab revisit (monitored by ApplicationHealthMonitor)");

    // v70.0: Monitor tracks isRefreshing directly, no callbacks needed

    this.abortController = new AbortController();

    // v70.0: 60s overall timeout (generous, each handler has its own 30s timeout)
    const overallTimeout = new Promise((_, reject) => 
      setTimeout(() => {
        console.error("🚨 v70.0 - Overall timeout reached after 60s");
        this.abortController?.abort();
        reject(new Error('Overall coordination timeout'));
      }, 60000)
    );

    try {
      await Promise.race([
        this.executeHandlers(),
        overallTimeout
      ]);
      
      const duration = Date.now() - startTime;
      console.log(`%c✅ v70.0 - Tab revisit complete in ${duration}ms`, "color: lime; font-weight: bold");
      
      // v70.0: Monitor tracks state directly, no callbacks needed
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ v70.0 - Coordination failed after ${duration}ms:`, error);
      
      // v70.0: Monitor tracks state directly, no callbacks needed
      
      // v70.0: Don't assume it's a session error - let handlers decide
      toast.error("Some data may not have loaded. Please refresh if needed.");
    } finally {
      // Process pending handlers
      if (this.pendingHandlers.length > 0) {
        console.log(`📋 v70.0 - Processing ${this.pendingHandlers.length} pending handlers`);
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
   * v70.0 - Simplified: Just run handlers with timeout protection
   * Session restoration is handled by UnifiedAuthContext.refreshAuth handler
   */
  private async executeHandlers() {
    console.log("═══════════════════════════════════════════════════");
    console.log(`🔁 v70.0 - Running ${this.refreshHandlers.length} handlers...`);
    console.log("═══════════════════════════════════════════════════");
    
    if (this.refreshHandlers.length === 0) {
      console.warn("⚠️ v70.0 - No handlers registered");
      return;
    }
    
    const handlerTimeout = 30000; // 30s per handler
    const handlerPromises = this.refreshHandlers.map(async (handler, index) => {
      const handlerStart = Date.now();
      console.log(`▶️ v70.0 - Handler ${index + 1} starting...`);
      
      try {
        if (this.abortController?.signal.aborted) {
          console.warn(`⚠️ v70.0 - Handler ${index + 1} aborted`);
          return;
        }
        
        await Promise.race([
          handler(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Handler timeout')), handlerTimeout)
          )
        ]);
        
        const duration = Date.now() - handlerStart;
        console.log(`✅ v70.0 - Handler ${index + 1} done in ${duration}ms`);
      } catch (err) {
        const duration = Date.now() - handlerStart;
        console.error(`❌ v70.0 - Handler ${index + 1} failed after ${duration}ms:`, err);
      }
    });
    
    const results = await Promise.allSettled(handlerPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log("═══════════════════════════════════════════════════");
    console.log(`✅ v70.0 - Handlers complete: ${successful} ok, ${failed} failed`);
    console.log("═══════════════════════════════════════════════════");
  }
}

export const visibilityCoordinator = new VisibilityCoordinator();
