import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CreditCard, Clock } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  requirePaymentMethod?: boolean;
  fallbackPath?: string;
}

/**
 * Phase 1: Access Control Component
 * Wraps protected features and redirects unauthorized users
 */
export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({
  children,
  requirePaymentMethod = false,
  fallbackPath = '/billing-security',
}) => {
  const { hasAccess, isLoading, reason, message } = useSubscriptionGuard(requirePaymentMethod);
  const [showLoadingTimeout, setShowLoadingTimeout] = React.useState(false);

  // Add timeout warning if loading takes too long
  React.useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowLoadingTimeout(true);
      }, 5000); // Show warning after 5 seconds
      
      return () => clearTimeout(timer);
    } else {
      setShowLoadingTimeout(false);
    }
  }, [isLoading]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          {showLoadingTimeout && (
            <p className="text-sm text-muted-foreground">
              Taking longer than usual... If this persists, try refreshing the page.
            </p>
          )}
        </div>
      </div>
    );
  }

  // If user has access, render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // Otherwise, show access denied message
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>Access Restricted</CardTitle>
          </div>
          <CardDescription>
            {message || 'You do not have access to this feature.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {reason === 'trial_expired' && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4" />
                Trial Period Ended
              </div>
              <p className="text-sm text-muted-foreground">
                Your 30-day free trial has expired. Upgrade to a paid subscription to continue managing your properties.
              </p>
            </div>
          )}

          {reason === 'subscription_cancelled' && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CreditCard className="h-4 w-4" />
                Subscription Cancelled
              </div>
              <p className="text-sm text-muted-foreground">
                Your subscription has been cancelled. Reactivate to regain access to your properties and maintenance requests.
              </p>
            </div>
          )}

          {reason === 'no_payment_method' && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CreditCard className="h-4 w-4" />
                Payment Method Required
              </div>
              <p className="text-sm text-muted-foreground">
                Please add a payment method to activate your trial subscription.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <a href={fallbackPath}>
                {reason === 'subscription_cancelled' ? 'Reactivate Subscription' : 'Go to Billing'}
              </a>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <a href="/dashboard">Return to Dashboard</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
