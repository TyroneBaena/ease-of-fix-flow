/**
 * Tab Visibility Coordinator v37.2
 *
 * Handles safe data refresh when user revisits the tab.
 * - No forced reload (prevents logout or data loss)
 * - Coordinates refresh across registered data providers
 * - Executes refreshes immediately without blocking
 * - v37.0: Proactive session monitoring and restoration
 * - v37.1: Fixed timeout mismatches for reliable user conversion
 * - v37.2: Always attempt restore with refresh_token (30+ day lifetime)
 */

type RefreshHandler = () => Promise<void | boolean> | void | boolean;

class VisibilityCoordinator {
  private isRefreshing = false;
  private refreshHandlers: RefreshHandler[] = [];
  private isListening = false;
  private lastHiddenTime: number | null = null;

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
      
      // CRITICAL v37.0: Try multiple times to get and backup session
      try {
        const { supabase, forceSessionBackup, restoreSessionFromBackup } = await import('@/integrations/supabase/client');
        
        // Get session with retries
        let session = null;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (!session?.access_token && attempts < maxAttempts) {
          attempts++;
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          
          if (currentSession?.access_token) {
            session = currentSession;
            break;
          } else if (attempts < maxAttempts) {
            console.warn(`⚠️ v37.0 - No session found (attempt ${attempts}/${maxAttempts}), trying backup...`);
            // Try to restore from backup if client lost it
            const restored = await restoreSessionFromBackup();
            if (restored?.access_token) {
              session = restored;
              console.log("✅ v37.0 - Session restored before hiding tab");
              break;
            }
            // Wait a bit before retry
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
        
        // Backup whatever we have
        if (session?.access_token) {
          const backed = forceSessionBackup(session);
          if (backed) {
            console.log("💾 v37.0 - Pre-hide session backup successful");
          } else {
            console.warn("⚠️ v37.0 - Pre-hide session backup failed");
          }
        } else {
          console.error("❌ v37.0 - No session to backup after all attempts!");
        }
        
        // Then disconnect Realtime
        console.log("👀 Tab hidden — disconnecting Realtime temporarily...");
        await supabase.realtime.disconnect();
      } catch (error) {
        console.error("❌ Pre-hide operations failed:", error);
      }
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
   * Coordinate data refresh across all tabs when tab becomes visible again
   * Executes auth first, then other handlers in parallel
   * v37.1: Rebalanced timeouts for reliable restoration
   */
  private async coordinateRefresh() {
    if (this.isRefreshing) {
      console.warn("⚙️ Refresh already in progress — forcing reset after 30s");
      
      setTimeout(() => {
        if (this.isRefreshing) {
          console.error("❌ Coordinator was stuck! Force-resetting isRefreshing flag");
          this.isRefreshing = false;
        }
      }, 30000);
      return;
    }

    this.isRefreshing = true;
    const coordinatorStartTime = Date.now();
    console.log(`🔁 Coordinating refresh (${this.refreshHandlers.length} handlers registered)...`);
    
    // v37.1: Increased to 28s to match new auth handler structure (25s auth + 3s buffer)
    const refreshTimeout = setTimeout(() => {
      console.error("❌ Coordinator timeout after 28s - force resetting");
      this.isRefreshing = false;
    }, 28000);

    try {
      // CRITICAL: Execute auth handler first (it's always registered first)
      if (this.refreshHandlers.length > 0) {
        const authHandler = this.refreshHandlers[0];
        
        // v37.1: Increased to 25s for multi-step restoration (getSession 4s + backup 6s + refresh 6s + conversion 8s = 24s worst case)
        const authSuccess = await Promise.race([
          authHandler(),
          new Promise<boolean>((resolve) => {
            setTimeout(() => {
              console.error("❌ Auth handler timeout after 25s");
              resolve(false);
            }, 25000);
          })
        ]);
        
        if (authSuccess === true) {
          const authDuration = Date.now() - coordinatorStartTime;
          console.log(`✅ Auth handler completed in ${authDuration}ms, session and user restored`);
          
          // v37.1: Reduced to 1000ms since auth handler now includes propagation wait
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log("✅ Final propagation complete, ready for data queries");
          
          // Reconnect Realtime after session restoration
          try {
            const { reconnectRealtime } = await import('@/integrations/supabase/client');
            await reconnectRealtime();
          } catch (realtimeError) {
            console.error("❌ Realtime reconnection failed:", realtimeError);
          }
        } else {
          const authDuration = Date.now() - coordinatorStartTime;
          console.error(`❌ Auth handler failed after ${authDuration}ms - session restoration unsuccessful`);
          console.warn("⚠️ Skipping data refresh - user needs to re-login");
          return;
        }
      }
      
      // Execute remaining handlers in parallel
      if (this.refreshHandlers.length > 1) {
        const dataHandlers = this.refreshHandlers.slice(1);
        await Promise.all(dataHandlers.map(handler => handler()));
        console.log("✅ All data handlers completed successfully");
      }
    } catch (error) {
      console.error("❌ Error during coordinated refresh", error);
    } finally {
      clearTimeout(refreshTimeout);
      this.isRefreshing = false;
      const totalDuration = Date.now() - coordinatorStartTime;
      console.log(`✅ Coordinator refresh cycle complete in ${totalDuration}ms`);
    }
  }
}

export const visibilityCoordinator = new VisibilityCoordinator();
