/**
 * Tab Visibility Coordinator v60.0 - Cookie-Based Session Restoration
 *
 * REVERTED TO COOKIE-BASED ARCHITECTURE:
 * ✅ Uses secure HttpOnly cookies for session storage
 * ✅ Calls /session endpoint to restore session on tab revisit
 * ✅ Server validates cookies and returns session data
 * ✅ Client calls setSession() to restore Supabase state
 *
 * CORE FLOW (v60.0):
 * 1. Tab visible → Call /session endpoint with credentials
 * 2. Server validates HttpOnly cookie
 * 3. Server returns validated session data
 * 4. Client calls setSession() to restore state
 * 5. Wait for auth listener to propagate
 * 6. Run refresh handlers
 * 
 * FEATURES:
 * - Secure HttpOnly cookie storage (no XSS exposure)
 * - Server-side session validation
 * - Works across domains with proper CORS
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
      console.log("🔒 v60.0 - Tab hidden");
      return;
    }

    console.log("🔓 v60.0 - Tab visible, triggering cookie-based refresh");
    this.coordinateRefresh();
  };

  /**
   * v60.0 - Cookie-based coordination with session endpoint
   */
  private async coordinateRefresh() {
    if (this.isRefreshing) {
      console.warn("⚙️ v60.0 - Refresh already in progress, skipping");
      return;
    }

    this.isCoordinating = true;
    this.isRefreshing = true;
    this.notifyTabRefreshChange(true);
    const startTime = Date.now();
    console.log("🔁 v60.0 - Starting tab revisit (cookie-based, 30s timeout)");

    this.abortController = new AbortController();

    // v60.0: 30s timeout (allows time for network call to /session endpoint)
    const overallTimeout = new Promise((_, reject) => 
      setTimeout(() => {
        console.error("🚨 v60.0 - Overall timeout reached after 30s");
        this.abortController?.abort();
        reject(new Error('Overall coordination timeout'));
      }, 30000)
    );

    try {
      await Promise.race([
        this.executeRefreshFlow(),
        overallTimeout
      ]);
      
      const duration = Date.now() - startTime;
      console.log(`%c✅ v60.0 - Tab revisit complete in ${duration}ms`, "color: lime; font-weight: bold");
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ v60.0 - Coordination failed after ${duration}ms:`, error);
      
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
        console.log(`📋 v60.0 - Processing ${this.pendingHandlers.length} pending handlers`);
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
   * v60.0 - Cookie-based: Restore session from /session endpoint
   */
  private async executeRefreshFlow() {
    console.log("═══════════════════════════════════════════════════");
    console.log("🚀 v60.0 - STEP 1: Restoring session from cookie...");
    console.log("═══════════════════════════════════════════════════");
    
    // STEP 1: Call /session endpoint to restore from HttpOnly cookie
    const sessionStart = Date.now();
    const { rehydrateSessionFromServer } = await import('./sessionRehydration');
    
    try {
      const restored = await rehydrateSessionFromServer();
      const sessionDuration = Date.now() - sessionStart;
      
      console.log(`🔍 v60.0 - Session restoration completed in ${sessionDuration}ms:`, {
        restored
      });

      if (!restored) {
        this.consecutiveFailures++;
        console.error(`❌ v60.0 - Session restoration failed (failures: ${this.consecutiveFailures})`);
        
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
      console.log("✅ v60.0 - STEP 1 COMPLETE - Session restored from cookie");
      
    } catch (error) {
      console.error("❌ v60.0 - STEP 1 FAILED - Could not restore session:", error);
      throw new Error('Session validation failed');
    }
    
    // STEP 2: Wait for auth listener to propagate
    console.log("═══════════════════════════════════════════════════");
    console.log("⏳ v60.0 - STEP 2: Waiting for auth listener...");
    console.log("═══════════════════════════════════════════════════");
    
    let attempts = 0;
    const maxAttempts = 100; // v60.0: 10s max (network call takes time)
    
    while (attempts < maxAttempts && this.sessionReadyCallback && !this.sessionReadyCallback()) {
      if (attempts % 10 === 0) {
        console.log(`⏳ v60.0 - STEP 2: Waiting... (${attempts * 100}ms)`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (this.sessionReadyCallback?.()) {
      console.log(`✅ v60.0 - STEP 2 COMPLETE - Ready in ${attempts * 100}ms`);
    } else {
      console.warn(`⚠️ v60.0 - STEP 2 TIMEOUT after ${attempts * 100}ms (continuing anyway)`);
    }
    
    // STEP 3: Run refresh handlers with isolation
    console.log("═══════════════════════════════════════════════════");
    console.log(`🔁 v60.0 - STEP 3: Running ${this.refreshHandlers.length} handlers...`);
    console.log("═══════════════════════════════════════════════════");
    
    if (this.refreshHandlers.length === 0) {
      console.warn("⚠️ v60.0 - No handlers registered");
      return;
    }
    
    const handlerTimeout = 30000; // 30s per handler
    const handlerPromises = this.refreshHandlers.map(async (handler, index) => {
      const handlerStart = Date.now();
      console.log(`▶️ v60.0 - Handler ${index + 1} starting...`);
      
      try {
        if (this.abortController?.signal.aborted) {
          console.warn(`⚠️ v60.0 - Handler ${index + 1} aborted`);
          return;
        }
        
        await Promise.race([
          handler(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Handler timeout')), handlerTimeout)
          )
        ]);
        
        const duration = Date.now() - handlerStart;
        console.log(`✅ v60.0 - Handler ${index + 1} done in ${duration}ms`);
      } catch (err) {
        const duration = Date.now() - handlerStart;
        console.error(`❌ v60.0 - Handler ${index + 1} failed after ${duration}ms:`, err);
      }
    });
    
    const results = await Promise.allSettled(handlerPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log("═══════════════════════════════════════════════════");
    console.log(`✅ v60.0 - STEP 3 COMPLETE - ${successful} ok, ${failed} failed`);
    console.log("═══════════════════════════════════════════════════");
  }
}

export const visibilityCoordinator = new VisibilityCoordinator();
