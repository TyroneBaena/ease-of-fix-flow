import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CreditCard, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFailedPaymentStatus } from '@/hooks/useFailedPaymentStatus';

export const FailedPaymentBanner: React.FC = () => {
  const navigate = useNavigate();
  const {
    hasFailedPayment,
    failedCount,
    isInGracePeriod,
    daysRemainingInGrace,
  } = useFailedPaymentStatus();

  if (!hasFailedPayment) {
    return null;
  }

  const isUrgent = failedCount >= 3;
  const showGracePeriod = isInGracePeriod && daysRemainingInGrace !== null;

  return (
    <Alert
      className={`mb-4 ${
        isUrgent
          ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950'
          : 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950'
      }`}
    >
      <AlertTriangle
        className={`h-5 w-5 ${
          isUrgent ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'
        }`}
      />
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1">
          <p
            className={`font-semibold mb-1 ${
              isUrgent ? 'text-red-900 dark:text-red-100' : 'text-orange-900 dark:text-orange-100'
            }`}
          >
            {isUrgent ? '⚠️ Payment Failed - Urgent Action Required' : '⚠️ Payment Issue Detected'}
          </p>
          <p
            className={`text-sm ${
              isUrgent ? 'text-red-800 dark:text-red-200' : 'text-orange-800 dark:text-orange-200'
            }`}
          >
            {isUrgent ? (
              <>
                Your payment has failed {failedCount} times.
                {showGracePeriod ? (
                  <>
                    {' '}
                    <span className="font-semibold inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {daysRemainingInGrace} {daysRemainingInGrace === 1 ? 'day' : 'days'} remaining
                    </span>{' '}
                    to update your payment method before service suspension.
                  </>
                ) : (
                  ' Please update your payment method immediately to avoid service interruption.'
                )}
              </>
            ) : (
              <>
                We couldn't process your payment (Attempt {failedCount}/3). Please update your
                payment method to avoid service interruption.
              </>
            )}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => navigate('/settings')}
          className={
            isUrgent
              ? 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800'
              : 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800'
          }
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Update Payment Method
        </Button>
      </AlertDescription>
    </Alert>
  );
};
