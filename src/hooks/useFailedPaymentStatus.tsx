import { useSubscription } from '@/contexts/subscription/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { useUserContext } from '@/contexts/UnifiedAuthContext';

interface FailedPaymentStatus {
  hasFailedPayment: boolean;
  failedCount: number;
  isInGracePeriod: boolean;
  gracePeriodEndsAt: string | null;
  daysRemainingInGrace: number | null;
  lastPaymentAttempt: string | null;
}

/**
 * Hook to check for failed payments and grace period status
 * Grace period: 7 days after 3rd failed payment attempt
 */
export const useFailedPaymentStatus = (): FailedPaymentStatus => {
  const { currentUser } = useUserContext();
  const { subscribed } = useSubscription();
  const [status, setStatus] = useState<FailedPaymentStatus>({
    hasFailedPayment: false,
    failedCount: 0,
    isInGracePeriod: false,
    gracePeriodEndsAt: null,
    daysRemainingInGrace: null,
    lastPaymentAttempt: null,
  });

  useEffect(() => {
    const checkFailedPaymentStatus = async () => {
      if (!currentUser?.id || !subscribed) {
        setStatus({
          hasFailedPayment: false,
          failedCount: 0,
          isInGracePeriod: false,
          gracePeriodEndsAt: null,
          daysRemainingInGrace: null,
          lastPaymentAttempt: null,
        });
        return;
      }

      try {
        const { data: subscriber, error } = await supabase
          .from('subscribers')
          .select('failed_payment_count, last_payment_attempt, payment_status')
          .eq('user_id', currentUser.id)
          .single();

        if (error || !subscriber) {
          console.error('Error fetching payment status:', error);
          return;
        }

        const failedCount = subscriber.failed_payment_count || 0;
        const hasFailedPayment = failedCount > 0;

        // Grace period starts after 3rd failed attempt and lasts 7 days
        const gracePeriodThreshold = 3;
        const gracePeriodDays = 7;

        let isInGracePeriod = false;
        let gracePeriodEndsAt: string | null = null;
        let daysRemainingInGrace: number | null = null;

        if (failedCount >= gracePeriodThreshold && subscriber.last_payment_attempt) {
          const lastAttemptDate = new Date(subscriber.last_payment_attempt);
          const gracePeriodEndDate = new Date(lastAttemptDate);
          gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + gracePeriodDays);

          const now = new Date();
          isInGracePeriod = now < gracePeriodEndDate;
          gracePeriodEndsAt = gracePeriodEndDate.toISOString();
          daysRemainingInGrace = isInGracePeriod
            ? Math.ceil((gracePeriodEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : 0;
        }

        setStatus({
          hasFailedPayment,
          failedCount,
          isInGracePeriod,
          gracePeriodEndsAt,
          daysRemainingInGrace,
          lastPaymentAttempt: subscriber.last_payment_attempt,
        });
      } catch (error) {
        console.error('Error checking failed payment status:', error);
      }
    };

    checkFailedPaymentStatus();

    // Check every 5 minutes for updates
    const interval = setInterval(checkFailedPaymentStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUser?.id, subscribed]);

  return status;
};
