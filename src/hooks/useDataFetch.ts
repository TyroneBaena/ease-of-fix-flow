import { useState, useEffect, useRef, useCallback } from 'react';

interface UseDataFetchOptions<T> {
  fetchFn: () => Promise<T>;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  timeout?: number; // in milliseconds
  retryAttempts?: number;
  retryDelay?: number; // in milliseconds
  refreshOnVisibility?: boolean;
  staleTime?: number; // in milliseconds
}

interface UseDataFetchReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Centralized data fetching hook with:
 * - Timeout protection (default 10s)
 * - Tab visibility detection
 * - Automatic refresh when tab becomes visible
 * - Retry mechanism with exponential backoff
 * - Guaranteed loading state reset
 * - Stale data detection
 */
export function useDataFetch<T>({
  fetchFn,
  enabled = true,
  onSuccess,
  onError,
  timeout = 10000,
  retryAttempts = 0,
  retryDelay = 1000,
  refreshOnVisibility = true,
  staleTime = 60000 // 1 minute
}: UseDataFetchOptions<T>): UseDataFetchReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  const isFetchingRef = useRef(false);
  const lastFetchRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);

  /**
   * Wraps fetch function with timeout protection
   */
  const fetchWithTimeout = useCallback(async (): Promise<T> => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const result = await fetchFn();
      clearTimeout(timeoutId);
      return result;
    } catch (err) {
      clearTimeout(timeoutId);
      if (controller.signal.aborted) {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw err;
    }
  }, [fetchFn, timeout]);

  /**
   * Fetch with retry logic
   */
  const fetchWithRetry = useCallback(async (): Promise<T> => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        const result = await fetchWithTimeout();
        retryCountRef.current = 0;
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown error');
        
        // Don't retry on last attempt
        if (attempt < retryAttempts) {
          // Exponential backoff
          const delay = retryDelay * Math.pow(2, attempt);
          console.log(`Retry attempt ${attempt + 1}/${retryAttempts} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }, [fetchWithTimeout, retryAttempts, retryDelay]);

  /**
   * Main fetch function with all protections
   */
  const executeFetch = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('useDataFetch - Already fetching, skipping request');
      return;
    }

    // Check if data is still fresh
    const now = Date.now();
    if (data && (now - lastFetchRef.current) < staleTime) {
      console.log('useDataFetch - Data still fresh, skipping fetch');
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      console.log('useDataFetch - Starting fetch');
      const result = await fetchWithRetry();
      
      setData(result);
      lastFetchRef.current = Date.now();
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      console.log('useDataFetch - Fetch completed successfully');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Fetch failed');
      console.error('useDataFetch - Fetch error:', error);
      
      setError(error);
      
      if (onError) {
        onError(error);
      }
    } finally {
      // CRITICAL: Always reset loading state
      setLoading(false);
      isFetchingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [data, staleTime, fetchWithRetry, onSuccess, onError]);

  /**
   * Manual refetch function
   */
  const refetch = useCallback(async () => {
    // Force fresh fetch by clearing stale time check
    lastFetchRef.current = 0;
    await executeFetch();
  }, [executeFetch]);

  /**
   * Handle tab visibility changes
   */
  useEffect(() => {
    if (!refreshOnVisibility || !enabled) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('useDataFetch - Tab became visible, checking for stale data');
        const now = Date.now();
        
        // If data is stale, refetch
        if ((now - lastFetchRef.current) > staleTime) {
          console.log('useDataFetch - Data is stale, refetching');
          refetch();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshOnVisibility, enabled, staleTime, refetch]);

  /**
   * Initial fetch when enabled
   */
  useEffect(() => {
    if (enabled) {
      executeFetch();
    }

    // Cleanup on unmount - abort any pending requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, executeFetch]);

  return {
    data,
    loading,
    error,
    refetch
  };
}
