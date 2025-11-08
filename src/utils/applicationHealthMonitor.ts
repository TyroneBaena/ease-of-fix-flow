/**
 * v69.0 - ApplicationHealthMonitor
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

// Monitor configuration
const CHECK_INTERVAL_MS = 5000; // Check every 5 seconds
const REFRESH_STUCK_THRESHOLD_MS = 20000; // 20 seconds
const QUERY_STUCK_THRESHOLD_MS = 20000; // 20 seconds
const DATA_STALE_THRESHOLD_MS = 60000; // 60 seconds

interface MonitorState {
  isRunning: boolean;
  intervalId: NodeJS.Timeout | null;
  lastCheckTime: number;
  lastSuccessfulFetch: number;
  refreshStartTime: number | null;
  consecutiveStuckChecks: number;
  recoveryInProgress: boolean;
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
  };

  private queryClient: QueryClient | null = null;

  /**
   * Initialize the monitor with QueryClient reference
   */
  public initialize(queryClient: QueryClient): void {
    console.log("🏥 v69.0 - ApplicationHealthMonitor - Initializing...");
    this.queryClient = queryClient;
    console.log("✅ v69.0 - ApplicationHealthMonitor - Initialized with QueryClient");
  }

  /**
   * Start the continuous background monitoring
   */
  public start(): void {
    if (this.state.isRunning) {
      console.warn("⚠️ v69.0 - ApplicationHealthMonitor - Already running");
      return;
    }

    console.log(`🏥 v69.0 - ApplicationHealthMonitor - Starting (check every ${CHECK_INTERVAL_MS}ms = ${CHECK_INTERVAL_MS / 1000}s)`);
    console.log(`🔍 v69.0 - Detection thresholds:`);
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

    console.log("✅ v69.0 - ApplicationHealthMonitor - Started successfully");
  }

  /**
   * Stop the monitor (for cleanup)
   */
  public stop(): void {
    if (!this.state.isRunning) return;

    console.log("🏥 v69.0 - ApplicationHealthMonitor - Stopping...");
    
    if (this.state.intervalId) {
      clearInterval(this.state.intervalId);
      this.state.intervalId = null;
    }

    this.state.isRunning = false;
    console.log("✅ v69.0 - ApplicationHealthMonitor - Stopped");
  }

  /**
   * Record when a refresh operation starts
   * Called by visibility coordinator
   */
  public recordRefreshStart(): void {
    this.state.refreshStartTime = Date.now();
    console.log("📝 v69.0 - Monitor - Refresh started");
  }

  /**
   * Record when a refresh operation ends
   * Called by visibility coordinator
   */
  public recordRefreshEnd(success: boolean): void {
    this.state.refreshStartTime = null;
    
    if (success) {
      this.state.lastSuccessfulFetch = Date.now();
      this.state.consecutiveStuckChecks = 0; // Reset stuck counter on success
      console.log("📝 v69.0 - Monitor - Refresh completed successfully");
    } else {
      console.log("📝 v69.0 - Monitor - Refresh completed with errors");
    }
  }

  /**
   * Perform comprehensive health check
   * Runs every CHECK_INTERVAL_MS
   */
  private async performHealthCheck(): Promise<void> {
    if (this.state.recoveryInProgress) {
      console.log("🏥 v69.0 - Health check skipped (recovery in progress)");
      return;
    }

    const now = Date.now();
    this.state.lastCheckTime = now;

    console.log(`🏥 v69.0 - Health check at ${new Date().toISOString()}`);

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
      console.log(`🚨 v69.0 - STUCK STATE DETECTED (${this.state.consecutiveStuckChecks} consecutive)`);
      console.log(`   Refresh stuck: ${refreshStuck}`);
      console.log(`   Queries stuck: ${queriesStuck}`);
      console.log(`   Data stale: ${dataStale}`);
      
      await this.triggerSoftRecovery();
    } else {
      // All clear
      if (this.state.consecutiveStuckChecks > 0) {
        console.log("✅ v69.0 - Health check PASSED (recovered from stuck state)");
      } else {
        console.log("✅ v69.0 - Health check PASSED (all systems healthy)");
      }
      this.state.consecutiveStuckChecks = 0;
    }
  }

  /**
   * Check if refresh operation is stuck
   */
  private checkRefreshStuck(now: number): boolean {
    if (!this.state.refreshStartTime) {
      return false; // Not currently refreshing
    }

    const elapsed = now - this.state.refreshStartTime;
    if (elapsed > REFRESH_STUCK_THRESHOLD_MS) {
      console.error(`❌ v69.0 - Refresh stuck for ${elapsed}ms (threshold: ${REFRESH_STUCK_THRESHOLD_MS}ms)`);
      return true;
    }

    return false;
  }

  /**
   * Check if React Query queries are stuck
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
      console.error(`❌ v69.0 - Found ${stuckQueries.length} stuck queries:`);
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
   * Check if last successful fetch is too old
   */
  private checkDataStale(now: number): boolean {
    const timeSinceLastFetch = now - this.state.lastSuccessfulFetch;
    
    if (timeSinceLastFetch > DATA_STALE_THRESHOLD_MS) {
      console.error(`❌ v69.0 - No successful data fetch in ${timeSinceLastFetch}ms (threshold: ${DATA_STALE_THRESHOLD_MS}ms)`);
      return true;
    }

    return false;
  }

  /**
   * Trigger soft recovery to unstick the application
   */
  private async triggerSoftRecovery(): Promise<void> {
    if (this.state.recoveryInProgress) {
      console.log("⚠️ v69.0 - Recovery already in progress, skipping");
      return;
    }

    this.state.recoveryInProgress = true;
    console.log("🔧 v69.0 - TRIGGERING SOFT RECOVERY");

    try {
      // Step 1: Reset coordinator state
      console.log("🔧 v69.0 - Step 1: Resetting coordinator state...");
      // Access coordinator's internal state reset (will add this method)
      
      // Step 2: Cancel and invalidate hung queries
      if (this.queryClient) {
        console.log("🔧 v69.0 - Step 2: Canceling and invalidating queries...");
        await this.queryClient.cancelQueries();
        await this.queryClient.invalidateQueries();
        console.log("✅ v69.0 - Queries canceled and invalidated");
      }

      // Step 3: Trigger coordinator's soft recovery
      console.log("🔧 v69.0 - Step 3: Calling coordinator.softRecovery()...");
      await visibilityCoordinator.softRecovery();

      // Step 4: Reset monitor state
      this.state.refreshStartTime = null;
      this.state.consecutiveStuckChecks = 0;
      this.state.lastSuccessfulFetch = Date.now(); // Give it fresh start

      console.log("✅ v69.0 - SOFT RECOVERY COMPLETE");
    } catch (error) {
      console.error("❌ v69.0 - Soft recovery failed:", error);
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
