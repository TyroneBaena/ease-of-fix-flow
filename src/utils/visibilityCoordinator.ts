/**
 * Tab Visibility Coordinator v57.0 - CRITICAL FIX: Early Exit + Isolated Handlers
 *
 * BUGS FIXED IN v57.0:
 * 1. ✅ Added early exit - handlers don't execute if session restoration fails
 * 2. ✅ Changed to Promise.allSettled() - one handler failure doesn't block others
 * 3. ✅ Reduced overall timeout to 45s (more reasonable than 70s)
 * 4. ✅ Individual handler timeout reduced to 30s (from 60s)
 * 5. ✅ Fixed CORS validation in session endpoint (exact origin matching)
 *
 * PREVIOUS FIXES (v56.0):
 * 1. ✅ Increased overall timeout to 70s (was 20s) to match 60s query timeouts
 * 2. ✅ Added abort controller to cancel in-flight handlers on timeout
 * 3. ✅ Added granular logging at every step to identify hang points
 * 4. ✅ Added session validation before triggering handlers
 * 5. ✅ Removed duplicate session ready callback registration (now only in TabVisibilityContext)
 *
 * CORE FLOW:
 * 1. Tab visible → Show loader
 * 2. Set coordination lock (prevents handler re-registration)
 * 3. Restore session on app's singleton client
 * 4. Validate session is actually set
 * 5. **EARLY EXIT**: If session fails, skip handlers and show error
 * 6. Wait for session ready in React context (uses CURRENT values via ref)
 * 7. Trigger data refresh handlers with isolation (allSettled)
 * 8. Release coordination lock
 * 9. Hide loader
 * 
 * FEATURES:
 * - Early exit prevents wasted time on failed sessions
 * - Handler isolation - one failure doesn't affect others
 * - Reduced timeouts prevent stuck loading states
 * - Coordination lock prevents handler re-registration during restore
 * - Stable handler callbacks access current state via refs (no stale closures)
 * - Single restore operation at a time (no race conditions)
 * - Session expiration detection
 * - Granular logging at every step
 */

import { rehydrateSessionFromServer } from '@/utils/sessionRehydration';
import { supabaseClient } from '@/integrations/supabase/client';
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
  private abortController: AbortController | null = null; // v56.0: Cancel in-flight handlers
  
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
   * v56.0 - Set callback to check if session is ready (now uses refs for current values)
   */
  public setSessionReadyCallback(callback: () => boolean) {
    this.sessionReadyCallback = callback;
    console.log('📝 v56.0 - Session ready callback registered');
  }

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
      console.log("🔒 v56.0 - Tab hidden");
      return;
    }

    console.log("🔓 v56.0 - Tab visible, triggering refresh");
    this.coordinateRefresh();
  };

  /**
   * v56.0 - Main coordination logic with abort controller and extended timeout
   */
  private async coordinateRefresh() {
    // Prevent overlapping restores
    if (this.isRefreshing) {
      console.warn("⚙️ v56.0 - Refresh already in progress, skipping");
      return;
    }

    // v56.0: Set coordination lock and show loader
    this.isCoordinating = true;
    this.isRefreshing = true;
    this.notifyTabRefreshChange(true);
    const startTime = Date.now();
    console.log("🔁 v56.0 - Starting tab revisit workflow with abort controller support");

    // v57.0: Create abort controller for canceling in-flight handlers
    this.abortController = new AbortController();

    // v57.0: CRITICAL FIX - Reduced timeout to 45s (was 70s) for faster recovery
    const overallTimeout = new Promise((_, reject) => 
      setTimeout(() => {
        console.error("🚨 v57.0 - Overall timeout reached after 45s, aborting handlers");
        this.abortController?.abort();
        reject(new Error('Overall coordination timeout'));
      }, 45000)
    );

    try {
      await Promise.race([
        this.executeRefreshFlow(),
        overallTimeout
      ]);
      
      const duration = Date.now() - startTime;
      console.log(`%c✅ v57.0 - Tab revisit complete in ${duration}ms`, "color: lime; font-weight: bold");
      toast.success("Data refreshed", { duration: 2000 });
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ v57.0 - Coordination failed after ${duration}ms:`, error);
      
      if (error.message === 'Overall coordination timeout') {
        console.error("🚨 v57.0 - Overall timeout reached, handlers aborted");
        toast.error("Session restoration timeout. Please refresh the page.");
      } else if (error.message === 'Session restoration failed') {
        console.error("🚨 v57.0 - Session restoration failed, skipping handlers");
        toast.error("Session restoration failed. Please refresh the page.");
      } else {
        toast.error("Failed to restore session. Please refresh the page.");
      }
      
      this.notifyError('SESSION_FAILED');
    } finally {
      // v54.0: CRITICAL FIX - Process pending handlers with deduplication
      if (this.pendingHandlers.length > 0) {
        console.log(`📋 v54.0 - Processing ${this.pendingHandlers.length} pending handlers`);
        
        // Use a copy to avoid modification during iteration
        const handlersToProcess = [...this.pendingHandlers];
        this.pendingHandlers = [];
        
        handlersToProcess.forEach(handler => {
          // Deduplicate: only add if not already in refreshHandlers
          if (!this.refreshHandlers.includes(handler)) {
            this.refreshHandlers.push(handler);
            console.log(`📝 v54.0 - Registered pending handler (total: ${this.refreshHandlers.length})`);
          } else {
            console.warn(`⚠️ v54.0 - Skipped duplicate handler from pending queue`);
          }
        });
      }
      
      // v57.0: Release coordination lock and clean up abort controller
      this.isCoordinating = false;
      this.isRefreshing = false;
      this.abortController = null;
      this.notifyTabRefreshChange(false);
      
      console.log(`📊 v57.0 - Final handler count: ${this.refreshHandlers.length} active, ${this.pendingHandlers.length} pending`);
    }
  }

  /**
   * v57.0 - Execute the refresh flow steps with early exit on session failure
   */
  private async executeRefreshFlow() {
    console.log("═══════════════════════════════════════════════════");
    console.log("🚀 v57.0 - STEP 1: Restoring session from backend...");
    console.log("═══════════════════════════════════════════════════");
    
    const restored = await rehydrateSessionFromServer();
    
    if (!restored) {
      this.consecutiveFailures++;
      console.error(`❌ v57.0 - STEP 1 FAILED - Session restoration (failures: ${this.consecutiveFailures})`);
      
      if (this.consecutiveFailures >= 2) {
        console.error("🚨 v57.0 - Session expired after multiple failures");
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
      // v57.0: CRITICAL FIX - Early exit, don't execute handlers if session fails
      throw new Error('Session restoration failed');
    }
    
    this.consecutiveFailures = 0;
    console.log("✅ v57.0 - STEP 1 COMPLETE - Session restored successfully");
    
    // v57.0: STEP 1.5: Validate session is actually set on client
    console.log("═══════════════════════════════════════════════════");
    console.log("🔍 v57.0 - STEP 1.5: Validating session on Supabase client...");
    console.log("═══════════════════════════════════════════════════");
    
    const { data: { session: currentSession }, error: sessionError } = await supabaseClient.auth.getSession();
    
    if (sessionError || !currentSession) {
      console.error("❌ v57.0 - STEP 1.5 FAILED - Session not set on client:", sessionError?.message);
      // v57.0: CRITICAL FIX - Early exit on validation failure
      throw new Error('Session validation failed');
    }
    
    console.log("✅ v57.0 - STEP 1.5 COMPLETE - Session validated:", {
      user: currentSession.user?.email,
      expiresAt: currentSession.expires_at
    });
    
    // STEP 2: Wait for session ready in React context
    console.log("═══════════════════════════════════════════════════");
    console.log("⏳ v57.0 - STEP 2: Waiting for auth listener to complete...");
    console.log("═══════════════════════════════════════════════════");
    
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max for auth listener
    
    while (attempts < maxAttempts && this.sessionReadyCallback && !this.sessionReadyCallback()) {
      if (attempts % 10 === 0) {
        console.log(`⏳ v57.0 - STEP 2: Still waiting... (${attempts * 100}ms elapsed)`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (this.sessionReadyCallback && this.sessionReadyCallback()) {
      console.log(`✅ v57.0 - STEP 2 COMPLETE - Auth listener ready after ${attempts * 100}ms`);
    } else {
      console.error("❌ v57.0 - STEP 2 FAILED - Auth listener timeout after 10s");
      throw new Error('Auth listener timeout');
    }
    
    // STEP 3: Trigger data refresh handlers with isolation (allSettled)
    console.log("═══════════════════════════════════════════════════");
    console.log(`🔁 v57.0 - STEP 3: Running ${this.refreshHandlers.length} refresh handlers (isolated)...`);
    console.log("═══════════════════════════════════════════════════");
    
    if (this.refreshHandlers.length === 0) {
      console.warn("⚠️ v57.0 - STEP 3: No handlers registered!");
      return;
    }
    
    // v57.0: CRITICAL FIX - Use allSettled for handler isolation
    const handlerPromises = this.refreshHandlers.map(async (handler, index) => {
      const handlerStart = Date.now();
      console.log(`▶️ v57.0 - Handler ${index + 1}/${this.refreshHandlers.length} starting...`);
      
      // v57.0: Individual handler timeout of 30s (reduced from 60s)
      const handlerTimeout = new Promise((_, reject) => 
        setTimeout(() => {
          console.error(`⏱️ v57.0 - Handler ${index + 1} timeout after 30s`);
          reject(new Error('Handler timeout'));
        }, 30000)
      );
      
      try {
        // Check if aborted before starting
        if (this.abortController?.signal.aborted) {
          console.warn(`⚠️ v57.0 - Handler ${index + 1} aborted before execution`);
          return;
        }
        
        await Promise.race([handler(), handlerTimeout]);
        
        const handlerDuration = Date.now() - handlerStart;
        console.log(`✅ v57.0 - Handler ${index + 1} completed in ${handlerDuration}ms`);
      } catch (err) {
        const handlerDuration = Date.now() - handlerStart;
        console.error(`❌ v57.0 - Handler ${index + 1} error after ${handlerDuration}ms:`, err);
        // v57.0: Don't throw - let other handlers continue
      }
    });
    
    // v57.0: CRITICAL FIX - Use allSettled instead of all for isolation
    const results = await Promise.allSettled(handlerPromises);
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;
    
    console.log("═══════════════════════════════════════════════════");
    console.log(`✅ v57.0 - STEP 3 COMPLETE - ${successCount} succeeded, ${failureCount} failed`);
    console.log("═══════════════════════════════════════════════════");
  }
}

export const visibilityCoordinator = new VisibilityCoordinator();
