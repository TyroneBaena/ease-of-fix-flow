/**
 * Silent Refresh Strategy
 * Refreshes authentication and pre-loads critical data when user returns to tab
 * WITHOUT showing loading states
 */

import { supabase } from '@/integrations/supabase/client';

interface SilentRefreshConfig {
  onRefreshComplete?: () => void;
  onRefreshError?: (error: Error) => void;
}

let lastVisibilityChangeTime = Date.now();
let isRefreshing = false;
let lastFullRefreshTime = 0;

// Tiered refresh strategy based on time away
const QUICK_SWITCH_THRESHOLD = 5000; // 5 seconds - just check session validity
const MEDIUM_AWAY_THRESHOLD = 30000; // 30 seconds - refresh session
const LONG_AWAY_THRESHOLD = 300000; // 5 minutes - full refresh with wake-up query

/**
 * Quick session validity check
 * Ultra-fast check that doesn't make any API calls
 */
const performQuickCheck = async () => {
  console.log('⚡ Quick session check (no API calls)');
  // Just verify we have a session in memory - Supabase handles token refresh automatically
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    console.log('✅ Session valid');
    return true;
  } else {
    console.log('⚠️ No session found - user not logged in');
    return false;
  }
};

/**
 * Medium refresh - just verify session validity
 * Lightweight check that relies on Supabase's auto-refresh
 */
const performMediumRefresh = async (config?: SilentRefreshConfig) => {
  try {
    console.log('🔄 Medium refresh - verifying session');
    
    // Just check if session exists - Supabase handles auto-refresh automatically
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('⚠️ Medium refresh - no session found (user not logged in)');
      return;
    }

    console.log('✅ Medium refresh - session valid');
    lastFullRefreshTime = Date.now();
    config?.onRefreshComplete?.();
  } catch (error) {
    console.error('❌ Medium refresh failed:', error);
    config?.onRefreshError?.(error as Error);
  }
};

/**
 * Full refresh with database connection warming
 * Most comprehensive but only for long absences
 * NOTE: Does NOT call refreshSession() - Supabase auto-refreshes tokens automatically
 */
export const performFullRefresh = async (config?: SilentRefreshConfig) => {
  if (isRefreshing) {
    console.log('🔄 Silent refresh already in progress, skipping');
    return;
  }

  try {
    isRefreshing = true;
    console.log('🔄 Starting FULL silent refresh...');

    // Step 1: Verify session exists (don't call refreshSession - let Supabase auto-refresh)
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('⚠️ Full refresh - no session found (user not logged in)');
      return;
    }

    console.log('✅ Full refresh - session valid');

    // Step 2: Trigger a lightweight query to "wake up" the database connection
    // This helps subsequent queries run faster after long absence
    const { error: wakeError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (!wakeError) {
      console.log('✅ Full refresh - database connection warmed up');
    } else {
      console.log('⚠️ Full refresh - database wake-up query failed (this is OK if user not logged in)');
    }

    lastFullRefreshTime = Date.now();
    config?.onRefreshComplete?.();
  } catch (error) {
    console.error('❌ Full refresh failed:', error);
    config?.onRefreshError?.(error as Error);
  } finally {
    isRefreshing = false;
  }
};

/**
 * Sets up automatic TIERED silent refresh when tab becomes visible
 * Handles ALL tab switches with intelligent refresh strategy:
 * - < 5s away: Quick check (no API calls)
 * - 5-30s away: Session refresh only
 * - 30s-5min away: Full refresh with DB wake-up
 * - > 5min away: Full refresh (guaranteed)
 */
export const setupSilentRefreshOnVisibility = (config?: SilentRefreshConfig) => {
  const handleVisibilityChange = () => {
    const now = Date.now();
    const timeSinceLastChange = now - lastVisibilityChangeTime;
    const timeSinceLastFullRefresh = now - lastFullRefreshTime;
    lastVisibilityChangeTime = now;

    if (document.hidden) {
      console.log('👁️ Tab hidden at', new Date().toISOString());
      return;
    }

    console.log('👁️ Tab visible at', new Date().toISOString());
    console.log('⏱️ Time away:', Math.round(timeSinceLastChange / 1000), 'seconds');

    // TIERED REFRESH STRATEGY
    // This handles ALL tab switches appropriately based on time away
    
    if (timeSinceLastChange < QUICK_SWITCH_THRESHOLD) {
      // Very quick tab switch (< 5 seconds) - just verify session exists
      console.log('⚡ Quick tab switch - performing instant session check');
      performQuickCheck();
      
    } else if (timeSinceLastChange < MEDIUM_AWAY_THRESHOLD) {
      // Medium absence (5-30 seconds) - refresh session to ensure freshness
      console.log('🔄 Medium absence - refreshing session');
      performMediumRefresh(config);
      
    } else if (timeSinceLastChange < LONG_AWAY_THRESHOLD) {
      // Longer absence (30s-5min) - full refresh with DB wake-up
      console.log('🔄 Longer absence - performing full refresh');
      performFullRefresh(config);
      
    } else {
      // Very long absence (> 5 minutes) - always full refresh
      console.log('🔄 Long absence (5+ min) - performing full refresh with priority');
      performFullRefresh(config);
    }
    
    // Additional safety: If last full refresh was > 5 minutes ago, do full refresh
    if (timeSinceLastFullRefresh > LONG_AWAY_THRESHOLD && timeSinceLastChange >= MEDIUM_AWAY_THRESHOLD) {
      console.log('🔄 Last full refresh was > 5min ago - forcing full refresh');
      performFullRefresh(config);
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
};
