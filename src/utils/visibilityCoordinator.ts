// /**
//  * Tab Visibility Coordinator
//  *
//  * Coordinates data refresh across multiple providers when user revisits the tab
//  * Prevents simultaneous queries that cause blocking and loading states
//  * Ensures data is fresh without overwhelming the database
//  */

// export interface RefreshHandler {
//   id: string;
//   refresh: () => Promise<void>;
//   staleThreshold: number; // milliseconds
//   priority: number; // Lower number = higher priority (1 = highest)
//   lastFetchTime: number;
// }

// class VisibilityCoordinator {
//   private handlers: Map<string, RefreshHandler> = new Map();
//   private isRefreshing = false;
//   private lastVisibilityChange = Date.now();
//   private visibilityListener: (() => void) | null = null;
//   private minHiddenTime = 5000; // Only refresh if tab was hidden for at least 5 seconds

//   /**
//    * Register a data provider for coordinated refresh
//    * CRITICAL: Prevents duplicate registrations and maintains existing fetch times
//    */
//   register(handler: Omit<RefreshHandler, "lastFetchTime">) {
//     const existing = this.handlers.get(handler.id);

//     // If already registered, update handler but keep the lastFetchTime
//     if (existing) {
//       console.log("🔄 VisibilityCoordinator - Updating existing handler:", handler.id);
//       this.handlers.set(handler.id, {
//         ...handler,
//         lastFetchTime: existing.lastFetchTime, // Preserve existing fetch time
//       });
//     } else {
//       console.log("🔄 VisibilityCoordinator - Registering new handler:", handler.id);
//       this.handlers.set(handler.id, {
//         ...handler,
//         lastFetchTime: Date.now(),
//       });
//     }
//   }

//   /**
//    * Unregister a data provider
//    */
//   unregister(handlerId: string) {
//     console.log("🔄 VisibilityCoordinator - Unregistering handler:", handlerId);
//     this.handlers.delete(handlerId);
//   }

//   /**
//    * Update last fetch time for a handler (called after successful refresh)
//    */
//   updateLastFetchTime(handlerId: string) {
//     const handler = this.handlers.get(handlerId);
//     if (handler) {
//       handler.lastFetchTime = Date.now();
//       console.log("🔄 VisibilityCoordinator - Updated fetch time for:", handlerId);
//     }
//   }

//   /**
//    * Start listening for visibility changes
//    */
//   startListening() {
//     if (this.visibilityListener) {
//       console.warn("🔄 VisibilityCoordinator - Already listening");
//       return;
//     }

//     console.log("🔄 VisibilityCoordinator - Starting visibility listener");

//     this.visibilityListener = () => {
//       if (!document.hidden) {
//         const timeSinceLastChange = Date.now() - this.lastVisibilityChange;
//         console.log("👁️ VisibilityCoordinator v5.0 - Tab visible after", Math.round(timeSinceLastChange / 1000), "s");

//         // Only refresh if tab was hidden for at least minimum time
//         if (timeSinceLastChange >= this.minHiddenTime) {
//           console.log("🔄 VisibilityCoordinator v5.0 - Initiating smart background refresh");
//           // Trigger coordinated background refresh - NO PAGE RELOAD
//           this.coordinateRefresh();
//         } else {
//           console.log("🔄 VisibilityCoordinator v5.0 - Quick tab switch, skipping refresh (< 5s)");
//         }
//       } else {
//         console.log("👁️ VisibilityCoordinator v5.0 - Tab hidden");
//         this.lastVisibilityChange = Date.now();
//       }
//     };

//     document.addEventListener("visibilitychange", this.visibilityListener);
//   }

//   /**
//    * Stop listening for visibility changes
//    */
//   stopListening() {
//     if (this.visibilityListener) {
//       console.log("🔄 VisibilityCoordinator - Stopping visibility listener");
//       document.removeEventListener("visibilitychange", this.visibilityListener);
//       this.visibilityListener = null;
//     }
//   }

//   /**
//    * Coordinate refresh across all registered handlers
//    * CRITICAL: This runs in background - NEVER blocks UI or shows loading states
//    * Only refreshes data that is actually stale based on each handler's threshold
//    */
//   private async coordinateRefresh() {
//     if (this.isRefreshing) {
//       console.log("🔄 VisibilityCoordinator v4.0 - Refresh already in progress, skipping");
//       return;
//     }

//     this.isRefreshing = true;

//     try {
//       const now = Date.now();

//       // Filter handlers that need refresh (data is stale based on THEIR threshold)
//       const staleHandlers = Array.from(this.handlers.values())
//         .filter((handler) => {
//           const timeSinceLastFetch = now - handler.lastFetchTime;
//           const isStale = timeSinceLastFetch > handler.staleThreshold;

//           console.log(
//             `🔄 VisibilityCoordinator v4.0 - ${handler.id}: ${Math.round(timeSinceLastFetch / 1000)}s old, threshold: ${Math.round(handler.staleThreshold / 1000)}s, ${isStale ? "STALE - refreshing" : "FRESH - skipping"}`,
//           );

//           return isStale;
//         })
//         .sort((a, b) => a.priority - b.priority); // Sort by priority

//       if (staleHandlers.length === 0) {
//         console.log("🔄 VisibilityCoordinator v4.0 - All data fresh, no refresh needed");
//         return;
//       }

//       console.log("🔄 VisibilityCoordinator v4.0 - Refreshing", staleHandlers.length, "stale handlers in background");

//       // Execute refreshes with staggered delays - BACKGROUND ONLY, NO BLOCKING
//       for (let i = 0; i < staleHandlers.length; i++) {
//         const handler = staleHandlers[i];

//         try {
//           console.log(
//             "🔄 VisibilityCoordinator v4.0 - Starting background refresh:",
//             handler.id,
//             "(priority",
//             handler.priority + ")",
//           );

//           // CRITICAL: Execute refresh in truly non-blocking manner
//           Promise.resolve().then(async () => {
//             try {
//               await handler.refresh();
//               console.log("🔄 VisibilityCoordinator v4.0 - Successfully refreshed:", handler.id);
//             } catch (error) {
//               console.error("🔄 VisibilityCoordinator v4.0 - Background refresh error for", handler.id, ":", error);
//             }
//           });

//           // Update fetch time immediately (optimistic)
//           handler.lastFetchTime = Date.now();

//           // Stagger next refresh to prevent database congestion
//           // CRITICAL: Use longer delays to prevent overwhelming the database
//           if (i < staleHandlers.length - 1) {
//             const delay = i === 0 ? 300 : 800; // Increased spacing for stability
//             await new Promise((resolve) => setTimeout(resolve, delay));
//           }
//         } catch (error) {
//           console.error("🔄 VisibilityCoordinator v4.0 - Error refreshing", handler.id, ":", error);
//         }
//       }

//       console.log("🔄 VisibilityCoordinator v4.0 - Background refresh initiated for all stale handlers");
//     } finally {
//       this.isRefreshing = false;
//     }
//   }

//   /**
//    * Manually trigger refresh (for testing or manual refresh buttons)
//    */
//   async manualRefresh() {
//     console.log("🔄 VisibilityCoordinator - Manual refresh triggered");
//     await this.coordinateRefresh();
//   }

//   /**
//    * Get current state for debugging
//    */
//   getState() {
//     return {
//       handlers: Array.from(this.handlers.entries()).map(([id, handler]) => ({
//         id,
//         priority: handler.priority,
//         staleThreshold: handler.staleThreshold,
//         lastFetchTime: handler.lastFetchTime,
//         timeSinceLastFetch: Date.now() - handler.lastFetchTime,
//       })),
//       isRefreshing: this.isRefreshing,
//       lastVisibilityChange: this.lastVisibilityChange,
//     };
//   }
// }

// // // Singleton instance
// export const visibilityCoordinator = new VisibilityCoordinator();
// /**
//  * Tab Visibility Coordinator v5.0
//  *
//  * Handles safe data refresh when user revisits the tab.
//  * - No forced reload (prevents logout or data loss)
//  * - Coordinates refresh across registered data providers
//  * - Only refreshes stale data
//  */

import { supabase } from "@/integrations/supabase/client";

type RefreshHandler = () => Promise<void> | void;

class VisibilityCoordinator {
  private isRefreshing = false;
  private refreshHandlers: RefreshHandler[] = [];
  private isListening = false;
  private lastHiddenTime: number | null = null;

  /**
   * Register a handler to run when refreshing data on tab visibility change
   */
  public onRefresh(handler: RefreshHandler) {
    this.refreshHandlers.push(handler);
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
  private handleVisibilityChange = () => {
    if (document.hidden) {
      this.lastHiddenTime = Date.now();
      console.log("🔒 Tab hidden at", new Date(this.lastHiddenTime).toISOString());
    } else {
      const now = Date.now();
      const hiddenDuration = this.lastHiddenTime ? now - this.lastHiddenTime : 0;

      console.log(`🔓 Tab visible again after ${hiddenDuration / 1000}s`);

      // Only refresh if tab was hidden for more than 5 seconds
      if (hiddenDuration > 5000) {
        this.coordinateRefresh();
      }

      this.lastHiddenTime = null;
    }
  };

  /**
   * Ensure Supabase session is ready before running refresh handlers
   */
  private async ensureSessionReady(retries = 3, delay = 500): Promise<boolean> {
    for (let i = 0; i < retries; i++) {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        console.log("🟢 Supabase session ready for refresh");
        return true;
      }
      console.warn(`🟡 Supabase session not ready (attempt ${i + 1}/${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    console.error("🔴 Supabase session failed to rehydrate after visibility change");
    return false;
  }

  /**
   * Coordinate data refresh across all tabs when tab becomes visible again
   */
  private async coordinateRefresh() {
    if (this.isRefreshing) {
      console.log("⚙️ Refresh already in progress — skipping duplicate refresh");
      return;
    }

    this.isRefreshing = true;
    console.log("🔁 Coordinating refresh across tabs...");

    // --- NEW: ensure Supabase session is ready before any API calls ---
    const sessionReady = await this.ensureSessionReady();
    if (!sessionReady) {
      console.warn("🚫 Skipping refresh because Supabase session is not yet ready");
      this.isRefreshing = false;
      return;
    }

    try {
      for (const handler of this.refreshHandlers) {
        await handler();
      }
      console.log("✅ All refresh handlers completed successfully");
    } catch (error) {
      console.error("❌ Error during coordinated refresh", error);
    } finally {
      this.isRefreshing = false;
    }
  }
}

export const visibilityCoordinator = new VisibilityCoordinator();
