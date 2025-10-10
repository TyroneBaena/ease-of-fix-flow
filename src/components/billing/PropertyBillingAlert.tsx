import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertTriangle, 
  Clock, 
  CreditCard, 
  Zap, 
  Building2,
  DollarSign 
} from 'lucide-react';
import { useSubscription } from '@/contexts/subscription/SubscriptionContext';
import { useNavigate } from 'react-router-dom';
import { usePropertyContext } from '@/contexts/property/PropertyContext';

export const PropertyBillingAlert: React.FC = () => {
  const { 
    isTrialActive, 
    subscribed, 
    isCancelled, 
    daysRemaining, 
    propertyCount,
    monthlyAmount,
    currency,
    loading 
  } = useSubscription();
  const { properties } = usePropertyContext();
  const navigate = useNavigate();

  if (loading) return null;

  const currentPropertyCount = properties.length;
  const billingAmount = currentPropertyCount * 29;

  // Show alert for trial users with properties
  if (isTrialActive && currentPropertyCount > 0) {
    const urgency = daysRemaining !== null && daysRemaining <= 7 ? 'urgent' : 'normal';
    
    return (
      <Card className={`border-l-4 ${urgency === 'urgent' ? 'border-l-orange-500 bg-orange-50' : 'border-l-blue-500 bg-blue-50'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            {urgency === 'urgent' ? (
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            ) : (
              <Clock className="h-5 w-5 text-blue-600" />
            )}
            <CardTitle className="text-sm font-medium">
              {urgency === 'urgent' ? 'Trial Ending Soon' : 'Free Trial Active'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                Properties managed
              </span>
              <span className="font-medium">{currentPropertyCount}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Monthly billing after trial
              </span>
              <span className="font-medium">${billingAmount} {currency}</span>
            </div>
            
            {daysRemaining !== null && (
              <Alert className={urgency === 'urgent' ? 'border-orange-200' : 'border-blue-200'}>
                <AlertDescription className="text-sm">
                  {urgency === 'urgent' 
                    ? `Trial expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Upgrade now to maintain access.`
                    : `${daysRemaining} days remaining in your free trial.`
                  }
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate('/pricing')} 
                size="sm"
                className="flex items-center gap-1"
              >
                <Zap className="h-3 w-3" />
                Upgrade Now
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/billing-security')} 
                size="sm"
              >
                Manage Trial
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show alert for cancelled users with properties
  if (isCancelled && currentPropertyCount > 0) {
    return (
      <Card className="border-l-4 border-l-red-500 bg-red-50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <CardTitle className="text-sm font-medium text-red-800">
              Access Restricted
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Alert className="border-red-200">
              <AlertDescription className="text-sm">
                Your subscription has been cancelled. Reactivate to continue managing your {currentPropertyCount} propert{currentPropertyCount !== 1 ? 'ies' : 'y'}.
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={() => navigate('/billing-security')} 
              size="sm"
              className="flex items-center gap-1"
            >
              <CreditCard className="h-3 w-3" />
              Reactivate Subscription
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No alert needed for subscribed users or users without properties
  return null;
};