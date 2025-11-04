import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Only runs in production to avoid noise during development
 */
export const initSentry = () => {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  
  // Only initialize in production with a valid DSN
  if (sentryDsn && import.meta.env.PROD) {
    Sentry.init({
      dsn: sentryDsn,
      environment: import.meta.env.MODE,
      
      // Minimal integrations to avoid React conflicts
      integrations: [
        Sentry.browserTracingIntegration(),
      ],
      
      // Lower sampling for production
      tracesSampleRate: 0.1,
      
      // Disable replay to prevent React interference
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      
      // Filter out sensitive data before sending
      beforeSend(event, hint) {
        // Remove sensitive data from event
        if (event.request) {
          delete event.request.cookies;
        }
        
        // Filter out irrelevant errors
        if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) {
          return null; // Ignore ResizeObserver errors
        }
        
        return event;
      },
      
      // Ignore specific errors
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        'Network request failed',
      ],
    });
    
    console.log('✅ Sentry initialized');
  } else if (import.meta.env.DEV) {
    console.log('ℹ️ Sentry skipped (development mode)');
  } else {
    console.warn('⚠️ Sentry DSN not configured');
  }
};

/**
 * Set user context for Sentry
 */
export const setSentryUser = (user: { id: string; email: string; name: string; role?: string } | null) => {
  // Temporarily enabled for testing
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
      role: user.role,
    });
  } else {
    Sentry.setUser(null);
  }
};

/**
 * Capture an exception manually
 */
export const captureException = (error: Error | string, context?: Record<string, any>) => {
  // Temporarily enabled for testing
  if (context) {
    Sentry.setContext('additional_context', context);
  }
  
  if (typeof error === 'string') {
    Sentry.captureMessage(error, 'error');
  } else {
    Sentry.captureException(error);
  }
};

/**
 * Add breadcrumb for tracking user actions
 */
export const addBreadcrumb = (message: string, category: string, data?: Record<string, any>) => {
  // Temporarily enabled for testing
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
};

export default Sentry;
