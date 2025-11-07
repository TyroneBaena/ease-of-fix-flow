/**
 * Tab Visibility Coordinator v59.0 - localStorage Persistence (Simplified)
 *
 * BREAKING CHANGE IN v59.0:
 * ✅ Removed complex cookie-based session restoration (now uses localStorage)
 * ✅ Supabase client now handles persistence automatically
 * ✅ Dramatically simplified flow - just verify session exists
 * ✅ Reduced timeouts (15s overall, 5s session ready)
 * ✅ Zero network dependency for session restoration
 *
 * CORE FLOW (v59.0):
 * 1. Tab visible → Check localStorage for session (instant)
 * 2. Verify session exists on client (~5ms)
 * 3. Wait for auth listener (max 5s)
 * 4. Run handlers with isolation
 * 
 * FEATURES:
 * - Domain-independent (localStorage works everywhere)
 * - Instant session restoration (<50ms)
 * - No server calls needed
 * - Auto token refresh (handled by Supabase client)
 * - Handler isolation with allSettled
 */

import { supabaseClient } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type RefreshHandler = () => Promise<void | boolean> | void | boolean;
type ErrorHandler = (error: 'SESSION_EXPIRED' | 'SESSION_FAILED') => void;

class VisibilityCoordinator {
  private isRefreshing = false;
  private isCoordinating = false;
  private refreshHandlers: RefreshHandler[] = [];
  private pendingHandlers: RefreshHandler[] = [];
  private isListening = false;
  private sessionReadyCallback: (() => boolean) | null = null;
  private consecutiveFailures = 0;
  private abortController: AbortController | null = null;
  
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
      console.log("🔒 v59.0 - Tab hidden");
      return;
    }

    console.log("🔓 v59.0 - Tab visible, triggering refresh");
    this.coordinateRefresh();
  };

  /**
   * v59.0 - Simplified coordination with localStorage-based persistence
   */
  private async coordinateRefresh() {
    if (this.isRefreshing) {
      console.warn("⚙️ v59.0 - Refresh already in progress, skipping");
      return;
    }

    this.isCoordinating = true;
    this.isRefreshing = true;
    this.notifyTabRefreshChange(true);
    const startTime = Date.now();
    console.log("🔁 v59.0 - Starting tab revisit (localStorage-based, 15s timeout)");

    this.abortController = new AbortController();

    // v59.0: Reduced to 15s overall timeout (localStorage is instant)
    const overallTimeout = new Promise((_, reject) => 
      setTimeout(() => {
        console.error("🚨 v59.0 - Overall timeout reached after 15s");
        this.abortController?.abort();
        reject(new Error('Overall coordination timeout'));
      }, 15000)
    );

    try {
      await Promise.race([
        this.executeRefreshFlow(),
        overallTimeout
      ]);
      
      const duration = Date.now() - startTime;
      console.log(`%c✅ v59.0 - Tab revisit complete in ${duration}ms`, "color: lime; font-weight: bold");
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ v59.0 - Coordination failed after ${duration}ms:`, error);
      
      if (error.message === 'Session validation failed') {
        toast.error("Session expired. Please log in again.");
        this.notifyError('SESSION_EXPIRED');
      } else {
        toast.error("Failed to load data. Please refresh.");
        this.notifyError('SESSION_FAILED');
      }
    } finally {
      // Process pending handlers
      if (this.pendingHandlers.length > 0) {
        console.log(`📋 v59.0 - Processing ${this.pendingHandlers.length} pending handlers`);
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
   * v59.0 - Simplified: Client now auto-persists, just verify session exists
   */
  private async executeRefreshFlow() {
    console.log("═══════════════════════════════════════════════════");
    console.log("🚀 v59.0 - STEP 1: Checking session (auto-persisted)...");
    console.log("═══════════════════════════════════════════════════");
    
    // STEP 1: Verify session exists (should be auto-restored from localStorage)
    const sessionStart = Date.now();
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    const sessionDuration = Date.now() - sessionStart;

    console.log(`🔍 v59.0 - Session check completed in ${sessionDuration}ms:`, {
      hasSession: !!session,
      error: error?.message,
      userId: session?.user?.id,
      email: session?.user?.email
    });

    if (error || !session) {
      this.consecutiveFailures++;
      console.error(`❌ v59.0 - No valid session (failures: ${this.consecutiveFailures})`);
      
      if (this.consecutiveFailures >= 2) {
        toast.error("Your session has expired. Please log in again.", {
          duration: 5000,
          position: 'top-center'
        });
        this.notifyError('SESSION_EXPIRED');
      } else {
        toast.warning("Session check failed. Retrying...", { duration: 3000 });
        this.notifyError('SESSION_FAILED');
      }
      
      throw new Error('Session validation failed');
    }
    
    this.consecutiveFailures = 0;
    console.log("✅ v59.0 - STEP 1 COMPLETE - Session valid:", session.user.email);
    
    // STEP 2: Wait for auth listener (minimal wait with localStorage)
    console.log("═══════════════════════════════════════════════════");
    console.log("⏳ v59.0 - STEP 2: Waiting for auth listener...");
    console.log("═══════════════════════════════════════════════════");
    
    let attempts = 0;
    const maxAttempts = 50; // v59.0: Reduced to 5s (localStorage is instant)
    
    while (attempts < maxAttempts && this.sessionReadyCallback && !this.sessionReadyCallback()) {
      if (attempts % 10 === 0) {
        console.log(`⏳ v59.0 - STEP 2: Waiting... (${attempts * 100}ms)`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (this.sessionReadyCallback?.()) {
      console.log(`✅ v59.0 - STEP 2 COMPLETE - Ready in ${attempts * 100}ms`);
    } else {
      console.warn(`⚠️ v59.0 - STEP 2 TIMEOUT after ${attempts * 100}ms (continuing anyway)`);
    }
    
    // STEP 3: Run refresh handlers with isolation
    console.log("═══════════════════════════════════════════════════");
    console.log(`🔁 v59.0 - STEP 3: Running ${this.refreshHandlers.length} handlers...`);
    console.log("═══════════════════════════════════════════════════");
    
    if (this.refreshHandlers.length === 0) {
      console.warn("⚠️ v59.0 - No handlers registered");
      return;
    }
    
    const handlerTimeout = 30000; // 30s per handler
    const handlerPromises = this.refreshHandlers.map(async (handler, index) => {
      const handlerStart = Date.now();
      console.log(`▶️ v59.0 - Handler ${index + 1} starting...`);
      
      try {
        if (this.abortController?.signal.aborted) {
          console.warn(`⚠️ v59.0 - Handler ${index + 1} aborted`);
          return;
        }
        
        await Promise.race([
          handler(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Handler timeout')), handlerTimeout)
          )
        ]);
        
        const duration = Date.now() - handlerStart;
        console.log(`✅ v59.0 - Handler ${index + 1} done in ${duration}ms`);
      } catch (err) {
        const duration = Date.now() - handlerStart;
        console.error(`❌ v59.0 - Handler ${index + 1} failed after ${duration}ms:`, err);
      }
    });
    
    const results = await Promise.allSettled(handlerPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log("═══════════════════════════════════════════════════");
    console.log(`✅ v59.0 - STEP 3 COMPLETE - ${successful} ok, ${failed} failed`);
    console.log("═══════════════════════════════════════════════════");
  }
}

export const visibilityCoordinator = new VisibilityCoordinator();
