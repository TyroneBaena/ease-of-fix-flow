/**
 * v72.0 - ApplicationHealthMonitor
 * 
 * Independent background monitor that runs continuously from app mount.
 * Detects stuck states and triggers automatic recovery without relying on
 * the visibility coordinator's lifecycle.
 * 
 * Key Features:
 * - Runs every 5 seconds via setInterval
 * - Detects multiple stuck conditions:
 *   1. isRefreshing stuck true for > 20s
 *   2. React Query queries stuck in isFetching/isLoading for > 20s
 *   3. No successful data fetch in > 60s
 * - Triggers soft recovery when stuck state detected
 * - Comprehensive logging for all checks and actions
 */

import { QueryClient } from "@tanstack/react-query";
import { visibilityCoordinator } from "./visibilityCoordinator";

// Monitor configuration - v72.0: More aggressive detection
const CHECK_INTERVAL_MS = 3000; // Check every 3 seconds (faster detection)
const REFRESH_STUCK_THRESHOLD_MS = 15000; // 15 seconds (detect before handler timeout)
const QUERY_STUCK_THRESHOLD_MS = 15000; // 15 seconds
const DATA_STALE_THRESHOLD_MS = 45000; // 45 seconds (detect before coordinator timeout)

interface MonitorState {
  isRunning: boolean;
  intervalId: NodeJS.Timeout | null;
  lastCheckTime: number;
  lastSuccessfulFetch: number;
  refreshStartTime: number | null;
  consecutiveStuckChecks: number;
  recoveryInProgress: boolean;
  coordinatorRefreshingSince: number | null; // v72.0: Track when coordinator started refreshing
}

class ApplicationHealthMonitor {
  private state: MonitorState = {
    isRunning: false,
    intervalId: null,
    lastCheckTime: 0,
    lastSuccessfulFetch: Date.now(),
    refreshStartTime: null,
    consecutiveStuckChecks: 0,
    recoveryInProgress: false,
    coordinatorRefreshingSince: null, // v72.0
  };

  private queryClient: QueryClient | null = null;

  /**
   * Initialize the monitor with QueryClient and visibility coordinator reference
   */
  public initialize(queryClient: QueryClient): void {
    console.log("🏥 v72.0 - ApplicationHealthMonitor - Initializing...");
    this.queryClient = queryClient;
    console.log("✅ v72.0 - ApplicationHealthMonitor - Initialized with QueryClient");
  }

  /**
   * Start the continuous background monitoring
   */
  public start(): void {
    if (this.state.isRunning) {
      console.warn("⚠️ v72.0 - ApplicationHealthMonitor - Already running");
      return;
    }

    console.log(`🏥 v72.0 - ApplicationHealthMonitor - Starting (check every ${CHECK_INTERVAL_MS}ms = ${CHECK_INTERVAL_MS / 1000}s)`);
    console.log(`🔍 v72.0 - Detection thresholds:`);
    console.log(`   - Refresh stuck: ${REFRESH_STUCK_THRESHOLD_MS / 1000}s`);
    console.log(`   - Query stuck: ${QUERY_STUCK_THRESHOLD_MS / 1000}s`);
    console.log(`   - Data stale: ${DATA_STALE_THRESHOLD_MS / 1000}s`);

    this.state.isRunning = true;
    this.state.lastCheckTime = Date.now();
    this.state.lastSuccessfulFetch = Date.now();

    // Start periodic health checks
    this.state.intervalId = setInterval(() => {
      this.performHealthCheck();
    }, CHECK_INTERVAL_MS);

    console.log("✅ v72.0 - ApplicationHealthMonitor - Started successfully");
  }

  /**
   * Stop the monitor (for cleanup)
   */
  public stop(): void {
    if (!this.state.isRunning) return;

    console.log("🏥 v72.0 - ApplicationHealthMonitor - Stopping...");
    
    if (this.state.intervalId) {
      clearInterval(this.state.intervalId);
      this.state.intervalId = null;
    }

    this.state.isRunning = false;
    console.log("✅ v72.0 - ApplicationHealthMonitor - Stopped");
  }

  /**
   * v72.0: REMOVED - No longer using coordinator callbacks
   * Monitor now tracks coordinator state directly via isRefreshing flag
   * This eliminates race conditions between coordinator lifecycle and monitoring
   */

  /**
   * v72.0: Perform comprehensive health check
   * Now directly monitors coordinator state instead of relying on callbacks
   */
  private async performHealthCheck(): Promise<void> {
    if (this.state.recoveryInProgress) {
      console.log("🏥 v74.0 - Health check skipped (recovery in progress)");
      return;
    }

    const now = Date.now();
    this.state.lastCheckTime = now;

    console.log(`🏥 v74.0 - Health check at ${new Date().toISOString()}`);

    // v74.0: Track when coordinator started refreshing (independent of callbacks)
    const coordinator = visibilityCoordinator;
    const isCoordinatorRefreshing = coordinator.getRefreshingState();
    
    if (isCoordinatorRefreshing && !this.state.coordinatorRefreshingSince) {
      this.state.coordinatorRefreshingSince = now;
      console.log("📝 v74.0 - Detected coordinator started refreshing");
    } else if (!isCoordinatorRefreshing && this.state.coordinatorRefreshingSince) {
      const duration = now - this.state.coordinatorRefreshingSince;
      console.log(`📝 v74.0 - Detected coordinator stopped refreshing (was active for ${duration}ms)`);
      this.state.coordinatorRefreshingSince = null;
      this.state.lastSuccessfulFetch = now; // Assume success when coordinator completes normally
      this.state.consecutiveStuckChecks = 0;
    }

    // Check 1: Is coordinator stuck refreshing?
    const refreshStuck = this.checkRefreshStuck(now);

    // Check 2: Are there stuck queries?
    const queriesStuck = this.checkQueriesStuck(now);

    // Check 3: Is data too stale?
    const dataStale = this.checkDataStale(now);

    // Determine if we need recovery
    const needsRecovery = refreshStuck || queriesStuck || dataStale;

    if (needsRecovery) {
      this.state.consecutiveStuckChecks++;
      console.log(`🚨 v74.0 - STUCK STATE DETECTED (${this.state.consecutiveStuckChecks} consecutive)`);
      console.log(`   Refresh stuck: ${refreshStuck}`);
      console.log(`   Queries stuck: ${queriesStuck}`);
      console.log(`   Data stale: ${dataStale}`);
      
      await this.triggerSoftRecovery();
    } else {
      // All clear
      if (this.state.consecutiveStuckChecks > 0) {
        console.log("✅ v74.0 - Health check PASSED (recovered from stuck state)");
      } else {
        console.log("✅ v74.0 - Health check PASSED (all systems healthy)");
      }
      this.state.consecutiveStuckChecks = 0;
    }
  }

  /**
   * v74.0: Check if refresh operation is stuck
   * Now uses coordinatorRefreshingSince instead of refreshStartTime
   */
  private checkRefreshStuck(now: number): boolean {
    if (!this.state.coordinatorRefreshingSince) {
      return false; // Not currently refreshing
    }

    const elapsed = now - this.state.coordinatorRefreshingSince;
    if (elapsed > REFRESH_STUCK_THRESHOLD_MS) {
      console.error(`❌ v74.0 - Refresh stuck for ${elapsed}ms (threshold: ${REFRESH_STUCK_THRESHOLD_MS}ms)`);
      return true;
    }

    return false;
  }

  /**
   * v74.0: Check if React Query queries are stuck
   */
  private checkQueriesStuck(now: number): boolean {
    if (!this.queryClient) return false;

    const allQueries = this.queryClient.getQueryCache().getAll();
    const stuckQueries = allQueries.filter(query => {
      const state = query.state;
      const isActivelyFetching = state.fetchStatus === 'fetching';
      
      if (!isActivelyFetching) return false;

      // Check if it's been fetching for too long
      const dataUpdatedAt = state.dataUpdatedAt || 0;
      const errorUpdatedAt = state.errorUpdatedAt || 0;
      const lastUpdateAt = Math.max(dataUpdatedAt, errorUpdatedAt);
      
      if (lastUpdateAt === 0) {
        // No timestamp available, consider it stuck if fetching
        return true;
      }

      const stuckDuration = now - lastUpdateAt;
      return stuckDuration > QUERY_STUCK_THRESHOLD_MS;
    });

    if (stuckQueries.length > 0) {
      console.error(`❌ v72.0 - Found ${stuckQueries.length} stuck queries:`);
      stuckQueries.forEach((query, index) => {
        const queryKey = JSON.stringify(query.queryKey);
        const dataAge = query.state.dataUpdatedAt ? now - query.state.dataUpdatedAt : 'never';
        console.error(`   ${index + 1}. ${queryKey}`);
        console.error(`      Status: ${query.state.fetchStatus}, Data age: ${dataAge}`);
      });
      return true;
    }

    return false;
  }

  /**
   * v72.0: Check if last successful fetch is too old
   */
  private checkDataStale(now: number): boolean {
    const timeSinceLastFetch = now - this.state.lastSuccessfulFetch;
    
    if (timeSinceLastFetch > DATA_STALE_THRESHOLD_MS) {
      console.error(`❌ v72.0 - No successful data fetch in ${timeSinceLastFetch}ms (threshold: ${DATA_STALE_THRESHOLD_MS}ms)`);
      return true;
    }

    return false;
  }

  /**
   * v74.0: Trigger soft recovery to unstick the application
   * CRITICAL FIX: Actually re-trigger data fetch via handlers
   * v74.0: Added delay between reset and re-trigger to prevent timeout race
   */
  private async triggerSoftRecovery(): Promise<void> {
    if (this.state.recoveryInProgress) {
      console.log("⚠️ v74.0 - Recovery already in progress, skipping");
      return;
    }

    this.state.recoveryInProgress = true;
    console.log("═══════════════════════════════════════════════════");
    console.log("🔧 v74.0 - TRIGGERING SOFT RECOVERY");
    console.log("═══════════════════════════════════════════════════");

    try {
      // Step 1: Cancel hung queries
      if (this.queryClient) {
        console.log("🔧 v74.0 - Step 1: Canceling all queries...");
        await this.queryClient.cancelQueries();
        console.log("✅ v74.0 - All queries canceled");
      }

      // Step 2: Force reset coordinator state (clears timeout!)
      console.log("🔧 v74.0 - Step 2: Force resetting coordinator (clearing timeouts)...");
      await visibilityCoordinator.forceReset();
      console.log("✅ v74.0 - Coordinator reset (timeout cleared)");

      // Step 3: Invalidate queries to mark as stale
      if (this.queryClient) {
        console.log("🔧 v74.0 - Step 3: Invalidating queries...");
        await this.queryClient.invalidateQueries();
        console.log("✅ v74.0 - Queries invalidated");
      }

      // Step 4: Re-trigger handlers to actually fetch data
      // Note: triggerRefresh() now includes its own 500ms delay
      console.log("🔧 v74.0 - Step 4: Re-triggering data fetch via handlers...");
      await visibilityCoordinator.triggerRefresh();
      console.log("✅ v74.0 - Handlers re-triggered");

      // Step 5: Reset monitor state
      this.state.coordinatorRefreshingSince = null;
      this.state.consecutiveStuckChecks = 0;
      this.state.lastSuccessfulFetch = Date.now();

      console.log("═══════════════════════════════════════════════════");
      console.log("✅ v74.0 - SOFT RECOVERY COMPLETE");
      console.log("═══════════════════════════════════════════════════");
    } catch (error) {
      console.error("❌ v74.0 - Soft recovery failed:", error);
    } finally {
      this.state.recoveryInProgress = false;
    }
  }

  /**
   * Get current monitor state (for debugging)
   */
  public getState(): Readonly<MonitorState> {
    return { ...this.state };
  }
}

// Export singleton instance
export const applicationHealthMonitor = new ApplicationHealthMonitor();
