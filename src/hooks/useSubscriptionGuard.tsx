import { useEffect, useState } from 'react';
import { useSubscription } from '@/contexts/subscription/SubscriptionContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useFailedPaymentStatus } from './useFailedPaymentStatus';

interface SubscriptionGuardResult {
  hasAccess: boolean;
  isLoading: boolean;
  reason?: 'trial_expired' | 'subscription_cancelled' | 'no_payment_method' | 'no_subscription' | 'grace_period_expired';
  message?: string;
}

/**
 * Phase 2: Access Control Middleware with Grace Period
 * Blocks access for users with expired/cancelled subscriptions
 * Allows 7-day grace period after 3rd failed payment
 */
export const useSubscriptionGuard = (requirePaymentMethod: boolean = false): SubscriptionGuardResult => {
  const navigate = useNavigate();
  const {
    subscribed,
    isTrialActive,
    isCancelled,
    loading,
    trialEndDate,
  } = useSubscription();
  
  const {
    failedCount,
    isInGracePeriod,
    daysRemainingInGrace,
  } = useFailedPaymentStatus();

  const [guardResult, setGuardResult] = useState<SubscriptionGuardResult>({
    hasAccess: true, // Default to allowing access during initial load
    isLoading: true,
  });

  useEffect(() => {
    // CRITICAL: Keep showing loading state until subscription data is fully loaded
    if (loading) {
      setGuardResult({ 
        hasAccess: true,  // Allow access while loading to prevent flickering
        isLoading: true 
      });
      return;
    }

    // DEBUG: Log subscription state
    console.log('🔍 Subscription Guard Check:', {
      subscribed,
      isTrialActive,
      isCancelled,
      trialEndDate,
      loading
    });

    // CRITICAL FIX: If subscription data is null/undefined, treat as still loading
    // This prevents race conditions during client-side navigation  
    // We must wait for ACTUAL boolean values, not null/undefined
    if (subscribed === null || subscribed === undefined || 
        isTrialActive === null || isTrialActive === undefined) {
      console.log('⏳ Subscription Guard: Data not fully resolved (null/undefined) - staying in loading state');
      setGuardResult({
        hasAccess: true,  // Allow access to prevent flickering during state transitions
        isLoading: true   // CRITICAL: Must stay in loading state until we have real data
      });
      return;
    }

    // CRITICAL FIX: Allow access if trial is active
    if (isTrialActive === true) {
      console.log('✅ Subscription Guard: Active trial - granting access');
      setGuardResult({
        hasAccess: true,
        isLoading: false,
      });
      return;
    }

    // CRITICAL FIX: Allow access if subscribed
    if (subscribed === true) {
      console.log('✅ Subscription Guard: Active subscription - granting access');
      setGuardResult({
        hasAccess: true,
        isLoading: false,
      });
      return;
    }

    // Check 1: Trial expired
    if (!subscribed && !isTrialActive && trialEndDate) {
      const trialExpired = new Date(trialEndDate) < new Date();
      if (trialExpired) {
        setGuardResult({
          hasAccess: false,
          isLoading: false,
          reason: 'trial_expired',
          message: 'Your trial has expired. Please upgrade to continue.',
        });
        
        toast.error('Trial Expired', {
          description: 'Please upgrade to continue using the platform.',
          action: {
            label: 'Go to Billing',
            onClick: () => navigate('/settings'),
          },
          duration: 10000,
        });
        return;
      }
    }

    // Check 2: Subscription cancelled
    if (isCancelled) {
      setGuardResult({
        hasAccess: false,
        isLoading: false,
        reason: 'subscription_cancelled',
        message: 'Your subscription has been cancelled. Please reactivate to continue.',
      });
      
      toast.error('Subscription Cancelled', {
        description: 'Please reactivate your subscription to continue.',
        action: {
          label: 'Reactivate',
          onClick: () => navigate('/billing'),
        },
        duration: 10000,
      });
      return;
    }

    // Check 3: No active subscription or trial
    // CRITICAL FIX: Allow access if both are null (user hasn't started trial yet)
    // Only block if they're explicitly false AND we have a trial end date (meaning they had a trial before)
    if (subscribed === false && isTrialActive === false) {
      // If there's NO trial end date, it means they never started a trial - allow access
      // They should be able to navigate to billing page to start their trial
      if (!trialEndDate) {
        console.log('🟢 Subscription Guard: New user without trial - allowing access to start trial');
        setGuardResult({
          hasAccess: true,
          isLoading: false,
        });
        return;
      }
      
      // If there IS a trial end date but trial is inactive, their trial must have expired
      setGuardResult({
        hasAccess: false,
        isLoading: false,
        reason: 'no_subscription',
        message: 'Please start your free trial or subscribe to access this feature.',
      });
      
      toast.error('Subscription Required', {
        description: 'Start your free trial to access this feature.',
        action: {
          label: 'Manage Billing',
          onClick: () => navigate('/billing'),
        },
        duration: 10000,
      });
      return;
    }

    // Check 4: Payment suspended after 3 failed attempts
    if (subscribed && failedCount >= 3) {
      setGuardResult({
        hasAccess: false,
        isLoading: false,
        reason: 'grace_period_expired',
        message: 'Your account has been suspended due to failed payments. Please update your payment method.',
      });
      
      toast.error('Account Suspended', {
        description: 'Your account has been suspended. Update your payment method to restore access immediately.',
        action: {
          label: 'Update Payment',
          onClick: () => navigate('/billing'),
        },
        duration: 15000,
      });
      return;
    }

    // All checks passed - user has access
    setGuardResult({
      hasAccess: true,
      isLoading: false,
    });
  }, [subscribed, isTrialActive, isCancelled, loading, trialEndDate, requirePaymentMethod, navigate, failedCount, isInGracePeriod]);

  return guardResult;
};
