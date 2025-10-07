import { useEffect, useState } from 'react';
import { useSubscription } from '@/contexts/subscription/SubscriptionContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface SubscriptionGuardResult {
  hasAccess: boolean;
  isLoading: boolean;
  reason?: 'trial_expired' | 'subscription_cancelled' | 'no_payment_method' | 'no_subscription';
  message?: string;
}

/**
 * Phase 1: Access Control Middleware
 * Blocks access for users with expired/cancelled subscriptions
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
            onClick: () => navigate('/billing'),
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
          onClick: () => navigate('/billing'),
        },
        duration: 10000,
      });
      return;
    }

    // All checks passed - user has access
    setGuardResult({
      hasAccess: true,
      isLoading: false,
    });
  }, [subscribed, isTrialActive, isCancelled, loading, trialEndDate, requirePaymentMethod, navigate]);

  return guardResult;
};
