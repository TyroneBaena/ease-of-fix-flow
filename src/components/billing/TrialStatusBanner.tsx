import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { useSubscription } from '@/contexts/subscription/SubscriptionContext';
import { cn } from '@/lib/utils';

interface TrialStatusBannerProps {
  className?: string;
  showActions?: boolean;
  onUpgrade?: () => void;
  onManageTrial?: () => void;
}

export const TrialStatusBanner: React.FC<TrialStatusBannerProps> = ({
  className,
  showActions = true,
  onUpgrade,
  onManageTrial
}) => {
  const { 
    isTrialActive, 
    daysRemaining, 
    propertyCount, 
    monthlyAmount, 
    currency,
    subscribed,
    loading
  } = useSubscription();

  if (loading) {
    return (
      <Alert className={cn("animate-pulse", className)}>
        <Clock className="h-4 w-4" />
        <AlertDescription>Loading subscription status...</AlertDescription>
      </Alert>
    );
  }

  // If user is fully subscribed (not trial), show success state
  if (subscribed && !isTrialActive) {
    return (
      <Alert className={cn("border-green-200 bg-green-50 dark:bg-green-950/20", className)}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-green-800 dark:text-green-200">
            Your subscription is active. {propertyCount} properties • {currency?.toUpperCase()} ${monthlyAmount}/month
          </span>
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Active
          </Badge>
        </AlertDescription>
      </Alert>
    );
  }

  // If trial is active, show trial status
  if (isTrialActive && daysRemaining !== null) {
    const isUrgent = daysRemaining <= 3;
    const isExpired = daysRemaining <= 0;

    if (isExpired) {
      return (
        <Alert className={cn("border-red-200 bg-red-50 dark:bg-red-950/20", className)}>
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-red-800 dark:text-red-200 font-medium">
                Your trial has expired
              </span>
              <span className="text-sm text-red-600 dark:text-red-300">
                {propertyCount} properties would cost {currency?.toUpperCase()} ${monthlyAmount}/month
              </span>
            </div>
            {showActions && (
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={onUpgrade}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <CreditCard className="h-3 w-3 mr-1" />
                  Subscribe Now
                </Button>
                {onManageTrial && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={onManageTrial}
                    className="border-red-200 text-red-700"
                  >
                    Manage
                  </Button>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Alert className={cn(
        isUrgent 
          ? "border-orange-200 bg-orange-50 dark:bg-orange-950/20" 
          : "border-blue-200 bg-blue-50 dark:bg-blue-950/20", 
        className
      )}>
        <Clock className={cn("h-4 w-4", isUrgent ? "text-orange-600" : "text-blue-600")} />
        <AlertDescription className="flex items-center justify-between">
          <span className={cn(
            "font-medium", 
            isUrgent 
              ? "text-orange-800 dark:text-orange-200" 
              : "text-blue-800 dark:text-blue-200"
          )}>
            Free Trial Active • {daysRemaining} days remaining
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  // If no trial and not subscribed, show call to action
  if (!subscribed && !isTrialActive) {
    return (
      <Alert className={cn("border-gray-200 bg-gray-50 dark:bg-gray-950/20", className)}>
        <CreditCard className="h-4 w-4 text-gray-600" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-gray-800 dark:text-gray-200 font-medium">
              Start your free trial
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Get 30 days free, then {currency?.toUpperCase()} $29 per property/month
            </span>
          </div>
          {showActions && (
            <Button 
              size="sm" 
              onClick={onUpgrade}
              className="bg-primary hover:bg-primary/90"
            >
              Start Free Trial
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};