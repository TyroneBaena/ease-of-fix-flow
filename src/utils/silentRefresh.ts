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
const MIN_REFRESH_INTERVAL = 60000; // Only refresh if away for 60+ seconds

/**
 * Performs silent refresh of auth session and critical data
 * This runs in background without showing loading states
 */
export const performSilentRefresh = async (config?: SilentRefreshConfig) => {
  if (isRefreshing) {
    console.log('🔄 Silent refresh already in progress, skipping');
    return;
  }

  try {
    isRefreshing = true;
    console.log('🔄 Starting silent refresh...');

    // Step 1: Refresh auth session (this ensures fresh tokens)
    const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
    
    if (sessionError) {
      console.warn('🔄 Silent refresh - session refresh failed:', sessionError);
      throw sessionError;
    }

    if (session) {
      console.log('✅ Silent refresh - session refreshed successfully');
    }

    // Step 2: Trigger a lightweight query to "wake up" the database connection
    // This helps subsequent queries run faster
    const { error: wakeError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (!wakeError) {
      console.log('✅ Silent refresh - database connection warmed up');
    }

    config?.onRefreshComplete?.();
  } catch (error) {
    console.error('❌ Silent refresh failed:', error);
    config?.onRefreshError?.(error as Error);
  } finally {
    isRefreshing = false;
  }
};

/**
 * Sets up automatic silent refresh when tab becomes visible
 * Only triggers if user was away for 60+ seconds
 */
export const setupSilentRefreshOnVisibility = (config?: SilentRefreshConfig) => {
  const handleVisibilityChange = () => {
    const now = Date.now();
    const timeSinceLastChange = now - lastVisibilityChangeTime;
    lastVisibilityChangeTime = now;

    if (document.hidden) {
      console.log('👁️ Tab hidden at', new Date().toISOString());
      return;
    }

    console.log('👁️ Tab visible at', new Date().toISOString());
    console.log('⏱️ Time away:', Math.round(timeSinceLastChange / 1000), 'seconds');

    // Only refresh if user was away for 60+ seconds
    if (timeSinceLastChange >= MIN_REFRESH_INTERVAL) {
      console.log('🔄 Triggering silent refresh (away for 60+ seconds)');
      performSilentRefresh(config);
    } else {
      console.log('⏭️ Skipping silent refresh (quick tab switch)');
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
};
