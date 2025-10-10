import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Clock,
  CreditCard
} from 'lucide-react';
import { useSubscription } from '@/contexts/subscription/SubscriptionContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export const BillingWidgets: React.FC = () => {
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
    loading
  } = useSubscription();

  // Distinguish between "never started trial" vs "trial expired"
  const hasNeverStartedTrial = !trialEndDate;
  const hasExpiredTrial = trialEndDate && !isTrialActive;

  if (loading) {
    return (
      <div className="grid md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const displayAmount = monthlyAmount || 0;
  const pricePerProperty = propertyCount && propertyCount > 0 ? displayAmount / propertyCount : 29;

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {/* Property Count */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Properties</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{propertyCount || 0}</div>
          <p className="text-xs text-muted-foreground">
            Properties being managed
          </p>
        </CardContent>
      </Card>

      {/* Monthly Billing */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Amount</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${displayAmount}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              {currency?.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            ${pricePerProperty.toFixed(0)} per property
          </p>
        </CardContent>
      </Card>

      {/* Subscription Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Subscription</CardTitle>
          {subscribed ? (
            <CreditCard className="h-4 w-4 text-green-500" />
          ) : (
            <Clock className="h-4 w-4 text-blue-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {subscribed ? (
              <>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Active
                </Badge>
              </>
            ) : isCancelled ? (
              <>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  Cancelled
                </Badge>
              </>
            ) : isTrialActive ? (
              <>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Trial
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {daysRemaining}d left
                </span>
              </>
            ) : hasNeverStartedTrial ? (
              <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                Available
              </Badge>
            ) : (
              <Badge variant="destructive">
                Expired
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {subscribed 
              ? 'Billing active'
              : isCancelled
                ? 'Reactivation available'
              : isTrialActive 
                ? `Ends ${trialEndDate ? format(new Date(trialEndDate), 'MMM dd') : 'soon'}`
                : hasNeverStartedTrial
                  ? 'Start free trial'
                  : 'Reactivation required'
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export const BillingSummaryCard: React.FC = () => {
  const navigate = useNavigate();
  const {
    subscribed,
    isTrialActive,
    trialEndDate,
    propertyCount,
    monthlyAmount,
    currency,
    loading
  } = useSubscription();

  // Distinguish between "never started trial" vs "trial expired"
  const hasNeverStartedTrial = !trialEndDate;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayAmount = monthlyAmount || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Billing Overview</CardTitle>
        <CardDescription>
          Current subscription and billing information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Properties</p>
            <p className="text-2xl font-bold">{propertyCount || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Monthly</p>
            <p className="text-2xl font-bold">
              ${displayAmount}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                {currency?.toUpperCase()}
              </span>
            </p>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Pricing Breakdown</span>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-xs text-muted-foreground">
            {propertyCount || 0} {(propertyCount || 0) === 1 ? 'property' : 'properties'} × $29 = ${displayAmount}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {subscribed 
              ? 'Active subscription' 
              : isTrialActive 
                ? 'Free trial active' 
                : hasNeverStartedTrial
                  ? 'Trial available'
                  : 'Trial ended'
            }
          </p>
        </div>

        <Button 
          variant="outline" 
          className="w-full" 
          onClick={() => navigate('/billing-security')}
        >
          Manage Billing
        </Button>
      </CardContent>
    </Card>
  );
};