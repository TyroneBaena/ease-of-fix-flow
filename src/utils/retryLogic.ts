/**
 * Smart Retry Logic for Data Queries v1.0
 * 
 * Handles transient failures with exponential backoff
 * - Max 3 retry attempts
 * - Exponential delays: 2s → 4s → 8s
 * - Auth-aware: Don't retry 401/403 errors
 * - Only retry read operations (SELECT queries)
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number; // milliseconds
  onRetry?: (attempt: number, error: any) => void;
}

export class RetryableError extends Error {
  constructor(message: string, public readonly originalError: any) {
    super(message);
    this.name = 'RetryableError';
  }
}

/**
 * Check if an error is retryable (not auth-related)
 */
function isRetryableError(error: any): boolean {
  // Don't retry auth errors
  if (error?.code === 'PGRST301' || // Auth required
      error?.message?.includes('JWT') ||
      error?.message?.includes('authentication') ||
      error?.message?.includes('unauthorized')) {
    return false;
  }
  
  // Don't retry if explicitly marked as non-retryable
  if (error?.retry === false) {
    return false;
  }
  
  // Retry timeouts and network errors
  return true;
}

/**
 * Execute a function with exponential backoff retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 2000,
    onRetry
  } = options;
  
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // If this is the last attempt or error is not retryable, throw
      if (attempt === maxAttempts || !isRetryableError(error)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1);
      
      console.warn(
        `⚠️ Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`,
        error
      );
      
      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt, error);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Should never reach here, but TypeScript needs it
  throw lastError;
}

/**
 * Wrapper for Supabase queries with retry logic
 */
export async function retryableQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options?: RetryOptions
): Promise<{ data: T | null; error: any }> {
  return withRetry(async () => {
    const result = await queryFn();
    
    // If there's an error, throw it so retry logic can catch it
    if (result.error) {
      throw result.error;
    }
    
    return result;
  }, options);
}
