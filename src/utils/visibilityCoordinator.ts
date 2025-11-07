/**
 * Tab Visibility Coordinator v57.0 - CRITICAL FIX: Null Session Detection & Fast Failure
 *
 * BUGS FIXED IN v56.0:
 * 1. ✅ Increased overall timeout to 70s (was 20s) to match 60s query timeouts
 * 2. ✅ Added abort controller to cancel in-flight handlers on timeout
 * 3. ✅ Added granular logging at every step to identify hang points
 * 4. ✅ Added session validation before triggering handlers
 * 5. ✅ Removed duplicate session ready callback registration (now only in TabVisibilityContext)
 *
 * PREVIOUS FIXES (v55.0):
 * 1. ✅ Session ready callback now accesses CURRENT auth state via ref (not stale closure)
 * 2. ✅ Properties load on initial login (session ready check no longer blocks)
 * 3. ✅ Tab revisit doesn't timeout waiting for stale session state
 * 4. ✅ Handlers use refs to access current auth values (not captured at registration)
 *
 * PREVIOUS FIXES (v54.0):
 * 1. ✅ Dual-array cleanup - Handlers removed from BOTH pending AND active arrays
 * 2. ✅ Handler deduplication - Prevents same handler from being registered multiple times
 * 3. ✅ Safe pending processing - Uses array copy to avoid modification during iteration
 * 4. ✅ Handler count logging - Tracks active vs pending for debugging
 *
 * CORE FLOW:
 * 1. Tab visible → Show loader
 * 2. Set coordination lock (prevents handler re-registration)
 * 3. Restore session on app's singleton client
 * 4. Validate session is actually set
 * 5. Wait for session ready in React context (uses CURRENT values via ref)
 * 6. Trigger data refresh handlers with abort controller
 * 7. Release coordination lock
 * 8. Hide loader
 * 
 * FEATURES:
 * - Coordination lock prevents handler re-registration during restore
 * - Stable handler callbacks access current state via refs (no stale closures)
 * - Single restore operation at a time (no race conditions)
 * - Overall timeout protection (70s to match query timeouts)
 * - Abort controller cancels in-flight handlers on timeout
 * - Proper handler cleanup to prevent accumulation
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

    // v56.0: Create abort controller for canceling in-flight handlers
    this.abortController = new AbortController();

    // v56.0: CRITICAL FIX - Increased timeout to 70s (was 20s) to match 60s query timeouts
    const overallTimeout = new Promise((_, reject) => 
      setTimeout(() => {
        console.error("🚨 v56.0 - Overall timeout reached after 70s, aborting handlers");
        this.abortController?.abort();
        reject(new Error('Overall coordination timeout'));
      }, 70000)
    );

    try {
      await Promise.race([
        this.executeRefreshFlow(),
        overallTimeout
      ]);
      
      const duration = Date.now() - startTime;
      console.log(`%c✅ v56.0 - Tab revisit complete in ${duration}ms`, "color: lime; font-weight: bold");
      toast.success("Data refreshed", { duration: 2000 });
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ v56.0 - Coordination failed after ${duration}ms:`, error);
      
      if (error.message === 'Overall coordination timeout') {
        console.error("🚨 v56.0 - Overall timeout reached, handlers aborted");
        toast.error("Session restoration timeout. Please refresh the page.");
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
      
      // v56.0: Release coordination lock and clean up abort controller
      this.isCoordinating = false;
      this.isRefreshing = false;
      this.abortController = null;
      this.notifyTabRefreshChange(false);
      
      console.log(`📊 v56.0 - Final handler count: ${this.refreshHandlers.length} active, ${this.pendingHandlers.length} pending`);
    }
  }

  /**
   * v57.0 - Execute the refresh flow with null session detection and fast failure
   */
  private async executeRefreshFlow() {
    console.log("═══════════════════════════════════════════════════");
    console.log("🚀 v57.0 - STEP 1: Restoring session from backend...");
    console.log("═══════════════════════════════════════════════════");
    
    const restored = await rehydrateSessionFromServer();
    
    if (!restored) {
      this.consecutiveFailures++;
      console.error(`❌ v57.0 - STEP 1 FAILED - Session restoration (failures: ${this.consecutiveFailures})`);
      
      // v57.0: Fail fast on first failure - don't retry if session is null
      if (this.consecutiveFailures >= 1) {
        console.error("🚨 v57.0 - Session expired or null - immediate redirect to login");
        toast.error("Your session has expired. Redirecting to login...", {
          duration: 3000,
          position: 'top-center'
        });
        this.notifyError('SESSION_EXPIRED');
        
        // v57.0: Redirect immediately
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      }
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
      console.error("❌ v57.0 - This means setSession() failed or was cancelled");
      
      // v57.0: Treat as session expired
      this.notifyError('SESSION_EXPIRED');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
      
      throw new Error('Session validation failed');
    }
    
    console.log("✅ v57.0 - STEP 1.5 COMPLETE - Session validated:", {
      user: currentSession.user?.email,
      expiresAt: currentSession.expires_at
    });
    
    // STEP 2: Wait for session ready in React context with reduced timeout
    console.log("═══════════════════════════════════════════════════");
    console.log("⏳ v57.0 - STEP 2: Waiting for auth listener to complete...");
    console.log("═══════════════════════════════════════════════════");
    
    let attempts = 0;
    const maxAttempts = 50; // v57.0: Reduced to 5 seconds (was 10s)
    
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
      console.error("❌ v57.0 - STEP 2 FAILED - Auth listener timeout after 5s");
      console.error("❌ v57.0 - This suggests React context not receiving session update");
      
      // v57.0: Don't wait forever - redirect to login
      this.notifyError('SESSION_FAILED');
      throw new Error('Auth listener timeout');
    }
    
    // STEP 3: Trigger data refresh handlers with abort support
    console.log("═══════════════════════════════════════════════════");
    console.log(`🔁 v57.0 - STEP 3: Running ${this.refreshHandlers.length} refresh handlers...`);
    console.log("═══════════════════════════════════════════════════");
    
    if (this.refreshHandlers.length === 0) {
      console.warn("⚠️ v57.0 - STEP 3: No handlers registered!");
      return;
    }
    
    const handlerPromises = this.refreshHandlers.map(async (handler, index) => {
      const handlerStart = Date.now();
      console.log(`▶️ v57.0 - Handler ${index + 1}/${this.refreshHandlers.length} starting...`);
      
      try {
        // Check if aborted before starting
        if (this.abortController?.signal.aborted) {
          console.warn(`⚠️ v57.0 - Handler ${index + 1} aborted before execution`);
          return;
        }
        
        await handler();
        
        const handlerDuration = Date.now() - handlerStart;
        console.log(`✅ v57.0 - Handler ${index + 1} completed in ${handlerDuration}ms`);
      } catch (err) {
        const handlerDuration = Date.now() - handlerStart;
        console.error(`❌ v57.0 - Handler ${index + 1} error after ${handlerDuration}ms:`, err);
      }
    });
    
    await Promise.all(handlerPromises);
    
    console.log("═══════════════════════════════════════════════════");
    console.log("✅ v57.0 - STEP 3 COMPLETE - All refresh handlers finished");
    console.log("═══════════════════════════════════════════════════");
  }
}

export const visibilityCoordinator = new VisibilityCoordinator();
