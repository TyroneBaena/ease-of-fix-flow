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
    hasAccess: true,
    isLoading: true,
  });

  useEffect(() => {
    if (loading) {
      setGuardResult({ hasAccess: false, isLoading: true });
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
            label: 'Upgrade Now',
            onClick: () => navigate('/billing-security'),
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
          onClick: () => navigate('/billing-security'),
        },
        duration: 10000,
      });
      return;
    }

    // Check 3: No active subscription or trial
    if (!subscribed && !isTrialActive) {
      setGuardResult({
        hasAccess: false,
        isLoading: false,
        reason: 'no_subscription',
        message: 'Please start your free trial or subscribe to access this feature.',
      });
      
      toast.error('Subscription Required', {
        description: 'Start your free trial to access this feature.',
        action: {
          label: 'Start Free Trial',
          onClick: () => navigate('/billing-security'),
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
          onClick: () => navigate('/billing-security'),
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
