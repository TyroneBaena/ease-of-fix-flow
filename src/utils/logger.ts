/**
 * Centralized logging utility to reduce console noise in production
 */

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
  },
  
  // Critical errors that should always be logged
  critical: (message: string, ...args: any[]) => {
    console.error(`🚨 CRITICAL: ${message}`, ...args);
  }
};

export default logger;