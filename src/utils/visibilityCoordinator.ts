/**
 * Tab Visibility Coordinator v5.0
 *
 * Handles safe data refresh when user revisits the tab.
 * - No forced reload (prevents logout or data loss)
 * - Coordinates refresh across registered data providers
 * - Executes refreshes immediately without blocking
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
   */
  private handleVisibilityChange = async () => {
    if (document.hidden) {
      this.lastHiddenTime = Date.now();
      console.log("🔒 Tab hidden at", new Date(this.lastHiddenTime).toISOString());
      
      // CRITICAL: Backup session FIRST (synchronously), then disconnect Realtime
      try {
        const { supabase, forceSessionBackup } = await import('@/integrations/supabase/client');
        
        // Get and backup session immediately
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const backed = forceSessionBackup(session);
          if (backed) {
            console.log("💾 Pre-hide session backup successful");
          } else {
            console.warn("⚠️ Pre-hide session backup failed");
          }
        } else {
          console.warn("⚠️ No session to backup on hide");
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
   * v33.0: Added timeout protection to prevent hung state
   */
  private async coordinateRefresh() {
    if (this.isRefreshing) {
      console.warn("⚙️ Refresh already in progress — forcing reset after 30s");
      
      // CRITICAL FIX: Reset stuck flag after 30 seconds
      setTimeout(() => {
        if (this.isRefreshing) {
          console.error("❌ Coordinator was stuck! Force-resetting isRefreshing flag");
          this.isRefreshing = false;
        }
      }, 30000);
      return;
    }

    this.isRefreshing = true;
    console.log(`🔁 Coordinating refresh (${this.refreshHandlers.length} handlers registered)...`);
    
    // CRITICAL FIX: Add timeout protection to prevent hung state
    const refreshTimeout = setTimeout(() => {
      console.error("❌ Coordinator timeout after 25s - force resetting");
      this.isRefreshing = false;
    }, 25000);

    try {
      // CRITICAL: Execute auth handler first (it's always registered first)
      // This ensures session AND user are fully restored before other queries run
      if (this.refreshHandlers.length > 0) {
        const authHandler = this.refreshHandlers[0];
        
        // CRITICAL FIX v33.0: Wrap auth handler with timeout protection
        const authSuccess = await Promise.race([
          authHandler(),
          new Promise<boolean>((resolve) => {
            setTimeout(() => {
              console.error("❌ Auth handler timeout after 20s");
              resolve(false);
            }, 20000);
          })
        ]);
        
        // CRITICAL FIX: Only proceed if auth actually succeeded
        if (authSuccess === true) {
          console.log("✅ Auth handler completed, session and user restored");
          
          // CRITICAL: Extended delay (1500ms) to ensure:
          // 1. Session is set in Supabase client
          // 2. User conversion completes  
          // 3. React context state updates propagate
          // 4. Queries have authenticated user context
          await new Promise(resolve => setTimeout(resolve, 1500));
          console.log("✅ Auth propagation complete, ready for data queries");
          
          // Reconnect Realtime after session restoration - only ONCE
          try {
            const { reconnectRealtime } = await import('@/integrations/supabase/client');
            await reconnectRealtime();
          } catch (realtimeError) {
            console.error("❌ Realtime reconnection failed:", realtimeError);
          }
        } else {
          console.error("❌ Auth handler failed - session restoration unsuccessful");
          console.warn("⚠️ Skipping data refresh - user needs to re-login");
          this.isRefreshing = false;
          return; // Don't proceed with data handlers if auth failed
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
      // CRITICAL: Always clear timeout and reset flag
      clearTimeout(refreshTimeout);
      this.isRefreshing = false;
      console.log("✅ Coordinator refresh cycle complete");
    }
  }
}

export const visibilityCoordinator = new VisibilityCoordinator();
