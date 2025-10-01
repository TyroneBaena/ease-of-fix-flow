# Sentry.io Integration Setup

This project is configured with Sentry.io for production error tracking and performance monitoring.

## Features Implemented

✅ **Error Tracking** - Automatic capture of unhandled errors and exceptions  
✅ **Performance Monitoring** - Track page loads and API calls (10% sample rate)  
✅ **Session Replay** - Record user sessions when errors occur  
✅ **User Context** - Track which users experience errors  
✅ **Breadcrumbs** - See user actions leading up to errors  
✅ **Development-Friendly** - Only runs in production builds  

## Setup Instructions

### 1. Create a Sentry Account

1. Go to [sentry.io](https://sentry.io) and sign up for a free account
2. Create a new project and select **React** as the platform
3. Copy your **DSN** (Data Source Name) - it looks like:
   ```
   https://[key]@[organization].ingest.sentry.io/[project-id]
   ```

### 2. Configure Environment Variable

Add your Sentry DSN to your `.env` file:

```bash
VITE_SENTRY_DSN="https://your-key@your-org.ingest.sentry.io/your-project-id"
```

**Important:** 
- ⚠️ Never commit your `.env` file to version control
- ✅ Add `.env` to your `.gitignore` (already done)
- 🔐 Use environment variables in your deployment platform (Vercel, Netlify, etc.)

### 3. Deploy to Production

Sentry only runs in production builds to avoid development noise:

```bash
# Build for production
npm run build

# Preview production build locally (Sentry will be active)
npm run preview
```

## Configuration

### Current Settings

The integration is configured in `src/lib/sentry.ts` with:

- **Trace Sample Rate:** 10% (1 in 10 transactions tracked)
- **Replay Session Sample Rate:** 10% (1 in 10 sessions recorded)
- **Replay Error Sample Rate:** 100% (all error sessions recorded)
- **Sensitive Data:** Automatically filtered (cookies, etc.)

### Adjust Sample Rates

For high-traffic applications, you may want to lower sample rates:

```typescript
// src/lib/sentry.ts
tracesSampleRate: 0.01,  // 1% of transactions
replaysSessionSampleRate: 0.01,  // 1% of sessions
```

## Integration Points

### 1. Error Boundary
All React errors are automatically caught and sent to Sentry:
- File: `src/components/ui/error-boundary.tsx`
- Includes component stack traces

### 2. Logger Utility
Enhanced logger sends errors to Sentry:
```typescript
import logger from '@/utils/logger';

// Regular error (sent to Sentry in production)
logger.error('Something went wrong', error);

// Critical error (always sent to Sentry, even in dev)
logger.critical('Critical system failure', error);

// Add breadcrumb for tracking
logger.breadcrumb('User clicked button', 'ui', { buttonId: 'submit' });
```

### 3. User Context
User information is automatically tracked:
- Set on login
- Cleared on logout
- Updated on user changes
- File: `src/contexts/UnifiedAuthContext.tsx`

### 4. Manual Error Capture
Capture custom errors anywhere:
```typescript
import { captureException, addBreadcrumb } from '@/lib/sentry';

try {
  // Your code
} catch (error) {
  captureException(error, { 
    customContext: 'Additional info' 
  });
}

// Track user actions
addBreadcrumb('Payment processed', 'payment', { 
  amount: 99.99 
});
```

## Viewing Errors in Sentry

1. Go to your Sentry project dashboard
2. Navigate to **Issues** to see all errors
3. Click on an issue to view:
   - Stack trace
   - User context (email, role, etc.)
   - Breadcrumbs (user actions before error)
   - Session replay (if available)
   - Environment and release information

## Filtered Errors

These errors are automatically ignored:
- `ResizeObserver loop limit exceeded`
- `Non-Error promise rejection captured`
- `Network request failed`

You can add more filters in `src/lib/sentry.ts`.

## Best Practices

### ✅ DO:
- Test Sentry in production or staging environments
- Review and triage errors regularly
- Use breadcrumbs to track important user actions
- Set appropriate sample rates based on your traffic
- Use `logger.critical()` for business-critical errors

### ❌ DON'T:
- Don't commit your Sentry DSN to version control
- Don't use high sample rates in high-traffic apps (costs)
- Don't log sensitive user data (PII is filtered automatically)
- Don't enable Sentry in development (it's already disabled)

## Testing Your Integration

1. **Build and preview locally:**
   ```bash
   npm run build
   npm run preview
   ```

2. **Trigger a test error:**
   - Throw an error in your code
   - Check the browser console for "Sentry initialized"
   - Wait 1-2 minutes for the error to appear in Sentry

3. **Verify user context:**
   - Log in to your app
   - Trigger an error
   - Check Sentry to see if user email/role is attached

## Troubleshooting

### "Sentry skipped (development mode)"
✅ **Expected behavior** - Sentry only runs in production

### "Sentry DSN not configured"
❌ Add `VITE_SENTRY_DSN` to your `.env` file and rebuild

### Errors not appearing in Sentry
1. Check that you're running a production build (`npm run build`)
2. Verify your DSN is correct in `.env`
3. Wait 1-2 minutes for errors to appear
4. Check browser console for Sentry initialization message

### Too many events being sent
💡 Lower your sample rates in `src/lib/sentry.ts`

## Support

- Sentry Documentation: https://docs.sentry.io/platforms/javascript/guides/react/
- Sentry Dashboard: https://sentry.io/
- Configuration: `src/lib/sentry.ts`

---

**Note:** This integration is production-ready and requires no additional setup beyond adding your DSN to the environment variables.
