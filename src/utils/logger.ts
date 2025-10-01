/**
 * Centralized logging utility to reduce console noise in production
 * Integrates with Sentry for error tracking
 */
import { captureException, addBreadcrumb } from '@/lib/sentry';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL: LogLevel = import.meta.env.DEV ? 'debug' : 'warn';

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] >= LOG_LEVELS[LOG_LEVEL];
};

export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (shouldLog('debug')) {
      console.log(`🔍 ${message}`, ...args);
    }
  },
  
  info: (message: string, ...args: any[]) => {
    if (shouldLog('info')) {
      console.info(`ℹ️ ${message}`, ...args);
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    if (shouldLog('warn')) {
      console.warn(`⚠️ ${message}`, ...args);
    }
  },
  
  error: (message: string, ...args: any[]) => {
    if (shouldLog('error')) {
      console.error(`❌ ${message}`, ...args);
    }
    
    // Send errors to Sentry in production
    if (import.meta.env.PROD) {
      const error = args[0] instanceof Error ? args[0] : new Error(message);
      captureException(error, { 
        logger_message: message,
        additional_args: args.slice(1)
      });
    }
  },
  
  // Critical errors that should always be logged and sent to Sentry
  critical: (message: string, ...args: any[]) => {
    console.error(`🚨 CRITICAL: ${message}`, ...args);
    
    // Always send critical errors to Sentry, even in development
    const error = args[0] instanceof Error ? args[0] : new Error(message);
    captureException(error, { 
      level: 'critical',
      logger_message: message,
      additional_args: args.slice(1)
    });
  },
  
  // Add breadcrumb for tracking user actions (sent to Sentry on error)
  breadcrumb: (message: string, category: string, data?: Record<string, any>) => {
    if (import.meta.env.PROD) {
      addBreadcrumb(message, category, data);
    }
  }
};

export default logger;