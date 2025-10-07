import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/contexts/subscription/SubscriptionContext';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle, 
  Building2, 
  TrendingUp, 
  Clock,
  DollarSign,
  Settings,
  ArrowLeft
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { PropertyCountDisplay } from './PropertyCountDisplay';
import { BillingPreview } from './BillingPreview';
import { CancellationFlow } from './CancellationFlow';
import { ReactivationFlow } from './ReactivationFlow';
import { PaymentSetupModal } from './PaymentSetupModal';
import { toast } from 'sonner';

export const BillingManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useUserContext();
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
    upgradeToPaid,
    calculateBilling,
    startTrial,
    refresh,
    pauseAutoRefresh,
    resumeAutoRefresh
  } = useSubscription();

  const [showCancellation, setShowCancellation] = useState(false);
  const [showReactivation, setShowReactivation] = useState(false);
  const [showPaymentSetup, setShowPaymentSetup] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);

  const handleStartTrial = async () => {
    setIsStartingTrial(true);
    try {
      const result = await startTrial();
      if (result.success) {
        toast.success('Welcome! Your 30-day free trial has started.');
        // Refresh subscription context to reflect the new trial status
        await refresh();
      } else {
        toast.error(result.error || 'Failed to start trial');
      }
    } catch (error) {
      toast.error('An error occurred while starting trial');
    } finally {
      setIsStartingTrial(false);
    }
  };

  const handleUpgradeToPaid = async () => {
    setIsUpgrading(true);
    try {
      const result = await upgradeToPaid();
      if (result.success) {
        toast.success('Successfully upgraded to paid subscription!');
      } else {
        toast.error(result.error || 'Failed to upgrade subscription');
      }
    } catch (error) {
      toast.error('An error occurred while upgrading');
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleCalculateBilling = async () => {
    setIsCalculating(true);
    try {
      const result = await calculateBilling();
      if (result.success) {
        toast.success('Billing information updated successfully');
      } else {
        toast.error(result.error || 'Failed to calculate billing');
      }
    } catch (error) {
      toast.error('An error occurred while calculating billing');
    } finally {
      setIsCalculating(false);
    }
  };

  // Debug function to verify payment method
  const handleVerifyPaymentMethod = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('verify-payment-method', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      console.log('Payment method verification:', data);
      if (data?.hasPaymentMethod) {
        toast.success(`Payment method found: ${data.paymentMethods[0]?.card?.brand} ending in ${data.paymentMethods[0]?.card?.last4}`);
      } else {
        toast.error('No payment method found');
      }
    } catch (error) {
      toast.error('Verification failed');
    }
  };

  // Stable callbacks for PaymentSetupModal to prevent re-renders
  const handlePaymentModalClose = useCallback(() => {
    console.log('[BillingManagement] Payment modal closing, resuming auto-refresh');
    setShowPaymentSetup(false);
    resumeAutoRefresh();
  }, [resumeAutoRefresh]);

  const handlePaymentModalComplete = useCallback(async () => {
    console.log('[BillingManagement] Payment complete callback triggered');
    // Don't close immediately - let the modal show success state first
    // The modal will handle its own closing after showing success
    
    // Refresh subscription data after a delay to avoid interfering with modal
    setTimeout(async () => {
      console.log('[BillingManagement] Refreshing subscription data and resuming auto-refresh...');
      resumeAutoRefresh();
      await refresh();
      toast.success('Payment method added successfully!');
    }, 2500);
  }, [refresh, resumeAutoRefresh]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate trial progress
  const trialProgress = isTrialActive && daysRemaining !== null 
    ? Math.max(0, Math.min(100, ((14 - daysRemaining) / 14) * 100))
    : 0;

  const isTrialExpiring = daysRemaining !== null && daysRemaining <= 3;
  const trialEndDateFormatted = trialEndDate ? format(new Date(trialEndDate), 'PPP') : null;
  const displayAmount = monthlyAmount || 0;
  
  // Determine if user has never started a trial (no trialEndDate) vs expired trial
  const hasNeverStartedTrial = !subscribed && !isTrialActive && !trialEndDate;
  const hasExpiredTrial = !subscribed && !isTrialActive && !!trialEndDate;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <div>
            <h1 className="text-3xl font-bold">Billing & Subscription</h1>
            <p className="text-muted-foreground">Manage your subscription and billing preferences</p>
          </div>
        </div>

        {/* Payment Method Setup - Show for trial users without payment method */}
        {isTrialActive && !showPaymentSetup && (
          <Card className="mb-6 border-blue-200 bg-blue-50/50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <CreditCard className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Add Payment Method</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Add a payment method to ensure uninterrupted service after your trial ends.
                  </p>
                  <Button 
                    onClick={() => {
                      console.log('[BillingManagement] Opening payment modal, pausing auto-refresh');
                      pauseAutoRefresh();
                      setShowPaymentSetup(true);
                    }}
                    size="sm"
                  >
                    Add Payment Method
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trial Status Alert */}
        {isTrialActive && (
          <Card className={`mb-6 ${isTrialExpiring ? 'border-orange-200 bg-orange-50/50' : 'border-blue-200 bg-blue-50/50'}`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {isTrialExpiring ? (
                  <AlertTriangle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                ) : (
                  <Clock className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">
                      {isTrialExpiring ? 'Trial Expiring Soon' : 'Free Trial Active'}
                    </h3>
                    <Badge variant={isTrialExpiring ? "destructive" : "secondary"}>
                      {daysRemaining} days left
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Your free trial {isTrialExpiring ? 'expires' : 'ends'} on {trialEndDateFormatted}
                  </p>
                  <Progress value={trialProgress} className="h-2 mb-3" />
                  <div className="flex items-center gap-3">
                    <Button 
                      onClick={handleUpgradeToPaid}
                      disabled={isUpgrading || !propertyCount}
                      size="sm"
                    >
                      {isUpgrading ? 'Upgrading...' : 'Upgrade to Paid'}
                    </Button>
                    {!propertyCount && (
                      <p className="text-xs text-muted-foreground">
                        Add properties to enable billing
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Subscription */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Current Subscription
                </CardTitle>
                <CardDescription>
                  Your subscription status and billing information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      {subscribed ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="font-medium">Active Subscription</span>
                        </>
                      ) : isTrialActive ? (
                        <>
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">Free Trial</span>
                        </>
                      ) : hasNeverStartedTrial ? (
                        <>
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">Trial Available</span>
                        </>
                      ) : hasExpiredTrial ? (
                        <>
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          <span className="font-medium">Trial Expired</span>
                        </>
                      ) : isCancelled ? (
                        <>
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span className="font-medium">Cancelled</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          <span className="font-medium">No Active Subscription</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Properties</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{propertyCount || 0}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Property Count Display */}
                <PropertyCountDisplay showTrend={true} />

                <Separator />

                {/* Current Billing */}
                <div>
                  <h4 className="font-medium mb-3">Current Billing</h4>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Monthly Amount</p>
                        <p className="text-2xl font-bold">
                          ${displayAmount} <span className="text-sm font-normal text-muted-foreground">{currency?.toUpperCase()}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Per Property</p>
                        <p className="text-lg font-semibold">$29</p>
                      </div>
                    </div>
                    {propertyCount && propertyCount > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {propertyCount} {propertyCount === 1 ? 'property' : 'properties'} × $29 = ${displayAmount}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {subscribed ? (
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCancellation(true)}
                      size="sm"
                    >
                      Cancel Subscription
                    </Button>
                  ) : isTrialActive ? (
                    <>
                      <Button 
                        onClick={handleUpgradeToPaid}
                        disabled={isUpgrading || !propertyCount}
                        size="sm"
                      >
                        {isUpgrading ? 'Upgrading...' : 'Upgrade to Paid'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowCancellation(true)}
                        size="sm"
                      >
                        Cancel Trial
                      </Button>
                    </>
                  ) : hasNeverStartedTrial ? (
                    <Button 
                      onClick={handleStartTrial}
                      disabled={isStartingTrial}
                      size="sm"
                    >
                      {isStartingTrial ? 'Starting Trial...' : 'Start Free Trial'}
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => setShowReactivation(true)}
                      size="sm"
                    >
                      Reactivate Subscription
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={handleCalculateBilling}
                    disabled={isCalculating}
                    size="sm"
                  >
                    {isCalculating ? 'Calculating...' : 'Refresh Billing'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleVerifyPaymentMethod}
                    size="sm"
                  >
                    Verify Payment
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Billing Preview */}
            <BillingPreview showDetails={true} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Billing Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current Period</span>
                  <span className="font-medium">${displayAmount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Per Property</span>
                  <span className="font-medium">$29</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Currency</span>
                  <span className="font-medium">{currency?.toUpperCase() || 'AUD'}</span>
                </div>
                {isTrialActive && trialEndDateFormatted && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Trial Ends</span>
                    <span className="font-medium text-xs">{format(new Date(trialEndDate!), 'MMM dd')}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Help & Support */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Questions about billing or your subscription?
                </p>
                <div className="space-y-2 text-sm">
                  <p>• Property-based pricing: $29/property</p>
                  <p>• Monthly billing cycles</p>
                  <p>• Pro-rated adjustments</p>
                  <p>• Cancel anytime</p>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modals */}
        {showCancellation && (
          <CancellationFlow 
            onBack={() => setShowCancellation(false)}
            onComplete={() => setShowCancellation(false)} 
          />
        )}

        {showReactivation && (
          <ReactivationFlow 
            onComplete={() => setShowReactivation(false)} 
          />
        )}

        <PaymentSetupModal
          isOpen={showPaymentSetup}
          onClose={handlePaymentModalClose}
          onComplete={handlePaymentModalComplete}
        />
      </div>
    </div>
  );
};