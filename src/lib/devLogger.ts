/**
 * Development-only logger utility
 * 
 * Logs are gated behind import.meta.env.DEV to prevent console spam in preview/production.
 * Set VITE_ENABLE_DEV_LOGS=true in development to enable verbose logging.
 * 
 * devError always logs to help debug critical issues.
 */

const shouldLog = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true';

export const devLog = shouldLog 
  ? (...args: any[]) => console.log(...args)
  : () => {};

export const devWarn = shouldLog
  ? (...args: any[]) => console.warn(...args)
  : () => {};

// Errors always log to help debug critical issues
export const devError = (...args: any[]) => console.error(...args);
