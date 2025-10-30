/**
 * Centralized Stripe Configuration
 * SECURITY: Only publishable keys should be stored here
 * Secret keys MUST be in Supabase Edge Function environment variables
 */

export const STRIPE_CONFIG = {
  // Publishable key - safe to expose in client-side code
  publishableKey: 'pk_live_51RvCRkERrSyHgYuuXuD442uyPBFySEnTCYMPvPqsRrycdrfrnCOdhMrZvBBuvWNEvywJg9gRLo0oPwxqDfUTGQvr004awSD5Rg',
  
  // Pricing configuration
  pricing: {
    perProperty: 29, // AUD per property per month
    currency: 'aud',
  },
  
  // Trial configuration
  trial: {
    durationDays: 30,
    maxProperties: 1, // Maximum properties allowed during trial
  },
} as const;

/**
 * Calculate monthly billing amount
 */
export function calculateMonthlyAmount(propertyCount: number): number {
  return propertyCount * STRIPE_CONFIG.pricing.perProperty;
}

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: number, currency: string = STRIPE_CONFIG.pricing.currency): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}
