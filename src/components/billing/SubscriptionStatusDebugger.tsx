import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/contexts/subscription/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle, Clock, CreditCard, XCircle } from 'lucide-react';

/**
 * Debug Component for Phase 1 Testing
 * Shows current subscription status and access control state
 */
export const SubscriptionStatusDebugger: React.FC = () => {
  const {
    subscribed,
    isTrialActive,
    isCancelled,
    daysRemaining,
    trialEndDate,
    loading,
    propertyCount,
    monthlyAmount,
  } = useSubscription();

  const [dbStatus, setDbStatus] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<any>(null);

  useEffect(() => {
    fetchDbStatus();
    fetchPaymentMethod();
  }, []);

  const fetchDbStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('subscribers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
      setDbStatus(data);
    }
  };

  const fetchPaymentMethod = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase.functions.invoke(
      'validate-payment-method',
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    if (!error && data) {
      setPaymentMethod(data);
    }
  };

  const getAccessStatus = () => {
    if (loading) return { status: 'loading', icon: Clock, color: 'text-yellow-600' };
    
    // Check trial expired
    if (!subscribed && !isTrialActive && trialEndDate) {
      const trialExpired = new Date(trialEndDate) < new Date();
      if (trialExpired) {
        return { 
          status: 'BLOCKED: Trial Expired', 
          icon: XCircle, 
          color: 'text-red-600',
          hasAccess: false 
        };
      }
    }

    // Check cancelled
    if (isCancelled) {
      return { 
        status: 'BLOCKED: Subscription Cancelled', 
        icon: XCircle, 
        color: 'text-red-600',
        hasAccess: false 
      };
    }

    // Check no subscription
    if (!subscribed && !isTrialActive) {
      return { 
        status: 'BLOCKED: No Subscription', 
        icon: XCircle, 
        color: 'text-red-600',
        hasAccess: false 
      };
    }

    // Access granted
    return { 
      status: 'ACCESS GRANTED', 
      icon: CheckCircle, 
      color: 'text-green-600',
      hasAccess: true 
    };
  };

  const accessStatus = getAccessStatus();
  const StatusIcon = accessStatus.icon;

  return (
    <Card className="border-2 border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Phase 1 Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Access Control Status */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <StatusIcon className={`h-5 w-5 ${accessStatus.color}`} />
            <span className={`font-bold ${accessStatus.color}`}>
              {accessStatus.status}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            {accessStatus.hasAccess 
              ? 'User can access properties and features'
              : 'User is blocked from accessing protected features'
            }
          </div>
        </div>

        {/* Subscription Context State */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="space-y-1">
            <div className="font-medium">Context State:</div>
            <div className="flex items-center gap-2">
              <Badge variant={subscribed ? "default" : "secondary"}>
                Subscribed: {subscribed ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isTrialActive ? "default" : "secondary"}>
                Trial Active: {isTrialActive ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isCancelled ? "destructive" : "secondary"}>
                Cancelled: {isCancelled ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="text-muted-foreground">
              Days Remaining: {daysRemaining ?? 'N/A'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-medium">Billing Info:</div>
            <div className="text-muted-foreground">
              Properties: {propertyCount}
            </div>
            <div className="text-muted-foreground">
              Monthly: ${monthlyAmount}
            </div>
            <div className="text-muted-foreground">
              Trial End: {trialEndDate ? new Date(trialEndDate).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>

        {/* Database State */}
        {dbStatus && (
          <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
            <div className="font-medium mb-2">Database Subscriber Record:</div>
            <div className="grid grid-cols-2 gap-1">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-mono">{dbStatus.email}</span>
              
              <span className="text-muted-foreground">Trial Active:</span>
              <span className="font-mono">{dbStatus.is_trial_active ? 'true' : 'false'}</span>
              
              <span className="text-muted-foreground">Subscribed:</span>
              <span className="font-mono">{dbStatus.subscribed ? 'true' : 'false'}</span>
              
              <span className="text-muted-foreground">Cancelled:</span>
              <span className="font-mono">{dbStatus.is_cancelled ? 'true' : 'false'}</span>
              
              <span className="text-muted-foreground">Customer ID:</span>
              <span className="font-mono text-[10px]">{dbStatus.stripe_customer_id || 'N/A'}</span>
              
              <span className="text-muted-foreground">Payment Method:</span>
              <span className="font-mono text-[10px]">{dbStatus.payment_method_id || 'N/A'}</span>
            </div>
          </div>
        )}

        {/* Payment Method Status */}
        {paymentMethod && (
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-4 w-4" />
              <span className="font-medium text-sm">Payment Method Status</span>
            </div>
            {paymentMethod.has_payment_method ? (
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Payment method attached</span>
                </div>
                {paymentMethod.payment_method && (
                  <div className="text-xs text-muted-foreground ml-6">
                    {paymentMethod.payment_method.brand} ending in {paymentMethod.payment_method.last4}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4 text-red-600" />
                <span>No payment method attached</span>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchDbStatus}>
            Refresh DB Status
          </Button>
          <Button size="sm" variant="outline" onClick={fetchPaymentMethod}>
            Check Payment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
