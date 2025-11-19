import React, { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, CreditCard, AlertTriangle, Clock, Zap } from 'lucide-react';
import { useSubscription } from '@/contexts/subscription/SubscriptionContext';
import { useNavigate } from 'react-router-dom';

interface TrialAccessControlProps {
  children: ReactNode;
  feature?: string;
  requiresSubscription?: boolean;
  className?: string;
}

export const TrialAccessControl: React.FC<TrialAccessControlProps> = ({
  children,
  feature = 'this feature',
  requiresSubscription = false,
  className
}) => {
  const navigate = useNavigate();
  const {
    subscribed,
    isTrialActive,
    isCancelled,
    daysRemaining,
    trialEndDate,
    propertyCount,
    monthlyAmount
  } = useSubscription();

  // Distinguish between "never started trial" vs "trial expired"
  const hasNeverStartedTrial = !trialEndDate;
  const hasExpiredTrial = trialEndDate && !isTrialActive;

  // If user has active subscription, show content
  if (subscribed) {
    return <>{children}</>;
  }

  // If trial is active and feature doesn't require subscription, show content
  if (isTrialActive && !requiresSubscription) {
    return <>{children}</>;
  }

  // Handle trial ending warning and content display
  const isTrialEnding = isTrialActive && daysRemaining !== null && daysRemaining <= 3;

  return (
    <div className={className}>
      {/* Show warning for trial ending soon */}
      {isTrialEnding && !requiresSubscription && (
        <Alert className="mb-4 border-orange-200 bg-orange-50">
          <Clock className="w-4 h-4" />
          <AlertDescription>
            Your trial expires in {daysRemaining} days. Upgrade now to continue accessing {feature}.
          </AlertDescription>
        </Alert>
      )}

      {/* Show access restriction for expired/cancelled trials or subscription-required features  
          Don't show access restriction for users who haven't started a trial yet */}
      {((hasExpiredTrial && !subscribed) || isCancelled || (isTrialActive && requiresSubscription)) && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-red-900">
              {isCancelled ? 'Subscription Required' : 
               hasExpiredTrial ? 'Trial Expired' : 
               'Premium Feature'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="space-y-2">
              {isCancelled && (
                <p className="text-red-700">
                  Your subscription was cancelled. Reactivate to access {feature}.
                </p>
              )}
              {hasExpiredTrial && (
                <p className="text-red-700">
                  Your free trial has ended. Upgrade to continue using {feature}.
                </p>
              )}
              {isTrialActive && requiresSubscription && (
                <p className="text-red-700">
                  This premium feature requires an active subscription.
                </p>
              )}
            </div>

            {propertyCount > 0 && (
              <div className="bg-white/60 rounded-lg p-3 border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Your billing would be:</span>
                  <Badge variant="outline">
                    ${monthlyAmount || propertyCount * 29}/month
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {propertyCount} {propertyCount === 1 ? 'property' : 'properties'} × $29 AUD
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button 
                onClick={() => navigate('/settings?tab=billing')}
                className="bg-red-600 hover:bg-red-700"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {isCancelled ? 'Reactivate' : 'Go to Billing'}
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/settings?tab=billing')}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                View Plans
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              30-day money-back guarantee • Cancel anytime
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show content with trial ending warning overlay */}
      {isTrialActive && !requiresSubscription && (
        <div className="relative">
          {isTrialEnding && (
            <div className="absolute inset-0 bg-orange-100/20 backdrop-blur-[1px] rounded-lg z-10 flex items-center justify-center">
              <Card className="border-orange-200 bg-orange-50 shadow-lg">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                  <h4 className="font-medium text-orange-900 mb-1">Trial Ending Soon</h4>
                  <p className="text-sm text-orange-700 mb-3">
                    {daysRemaining} days remaining. Upgrade to continue.
                  </p>
                  <Button 
                    size="sm"
                    onClick={() => navigate('/settings?tab=billing')}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    Upgrade
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
};