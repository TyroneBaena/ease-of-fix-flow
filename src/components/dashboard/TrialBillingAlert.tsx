import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  Clock, 
  CreditCard,
  Info,
  Building2, 
  TrendingUp,
  CheckCircle
} from 'lucide-react';
import { useSubscription } from '@/contexts/subscription/SubscriptionContext';
import { format } from 'date-fns';

export const TrialBillingAlert: React.FC = () => {
  const navigate = useNavigate();
  const {
    subscribed,
    isTrialActive,
    isCancelled,
    trialEndDate,
    daysRemaining,
    propertyCount,
    monthlyAmount,
    currency,
    loading,
    debugDatabaseState
  } = useSubscription();

  if (loading) return null;

  // Debug logging to see what state we're in
  console.log("🟡 TrialBillingAlert state:", {
    subscribed,
    isTrialActive,
    isCancelled,
    loading
  });

  const trialProgress = isTrialActive && daysRemaining !== null 
    ? Math.max(0, Math.min(100, ((14 - daysRemaining) / 14) * 100))
    : 0;

  const isTrialExpiring = daysRemaining !== null && daysRemaining <= 3;
  const trialEndDateFormatted = trialEndDate ? format(new Date(trialEndDate), 'PPP') : null;
  const displayAmount = monthlyAmount || 0;

  // Don't show if user has active subscription
  if (subscribed) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-green-900">Active Subscription</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  ${displayAmount}/{currency?.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-green-700 mt-1">
                {propertyCount} {propertyCount === 1 ? 'property' : 'properties'} • Next billing in 30 days
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/billing-security')}
              className="border-green-300 text-green-700 hover:bg-green-100"
            >
              Manage
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show trial status
  if (isTrialActive) {
    return (
      <Card className={`${isTrialExpiring ? 'border-orange-200 bg-orange-50/50' : 'border-blue-200 bg-blue-50/50'}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {isTrialExpiring ? (
              <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            ) : (
              <Clock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {isTrialExpiring ? 'Trial Expiring Soon' : 'Free Trial Active'}
                </span>
                <Badge variant={isTrialExpiring ? "destructive" : "secondary"}>
                  {daysRemaining} days left
                </Badge>
              </div>
              
              <Progress value={trialProgress} className="h-2" />
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Ends {trialEndDateFormatted}
                </span>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Building2 className="w-3 h-3" />
                  <span>{propertyCount} properties</span>
                </div>
              </div>

              {propertyCount && propertyCount > 0 && (
                <div className="bg-white/60 rounded-lg p-3 border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Your billing after trial:</span>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="font-semibold">${displayAmount}/{currency?.toUpperCase()}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {propertyCount} {propertyCount === 1 ? 'property' : 'properties'} × $29 = ${displayAmount} per month
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  size="sm"
                  onClick={() => navigate('/billing-security')}
                  disabled={!propertyCount}
                >
                  <CreditCard className="w-3 h-3 mr-1" />
                  Manage Subscription
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/billing-security')}
                >
                  View Billing
                </Button>
              </div>

              {!propertyCount && (
                <p className="text-xs text-muted-foreground">
                  Add properties to enable billing and continue after trial
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle cancelled state - show reactivation option with different messaging
  if (isCancelled) {
    return (
      <Card className="border-gray-200 bg-gray-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">Subscription Cancelled</span>
                <Badge variant="secondary">Cancelled</Badge>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                Your subscription has been cancelled. You can reactivate at any time to continue using all features.
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm"
                  onClick={() => navigate('/billing-security')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Reactivate
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/billing-security')}
                  className="border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  View Options
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if user hasn't started trial yet (no trial end date)
  if (!trialEndDate) {
    return (
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-blue-900">Start Your Free Trial</span>
                <Badge variant="outline" className="border-blue-300 text-blue-700">Available</Badge>
              </div>
              <p className="text-sm text-blue-700 mb-3">
                Get started with a 30-day free trial to access all features.
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm"
                  onClick={() => navigate('/billing-security')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Start Free Trial
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/billing-security')}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  View Plans
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Trial has ended - show reactivation option
  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-red-900">Trial Expired</span>
              <Badge variant="destructive">Action Required</Badge>
            </div>
              <p className="text-sm text-red-700 mb-3">
                Your free trial has ended. Upgrade to continue accessing all features.
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm"
                  onClick={() => navigate('/billing-security')}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Reactivate
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/billing-security')}
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  View Options
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => debugDatabaseState()}
                  className="border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Debug DB
                </Button>
              </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};