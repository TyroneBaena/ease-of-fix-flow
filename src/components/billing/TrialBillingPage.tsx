import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  CreditCard, 
  Shield, 
  CheckCircle, 
  Clock, 
  Building,
  Star,
  Zap,
  Users
} from 'lucide-react';
import { useSubscription } from '@/contexts/subscription/SubscriptionContext';
import { TrialStatusBanner } from './TrialStatusBanner';
import { BillingPreview } from './BillingPreview';
import { PropertyCountDisplay } from './PropertyCountDisplay';
import { SubscriptionStatusDebugger } from './SubscriptionStatusDebugger';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export const TrialBillingPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    isTrialActive, 
    daysRemaining, 
    propertyCount,
    monthlyAmount,
    currency,
    subscribed,
    startTrial,
    calculateBilling,
    upgradeToPaid,
    refresh,
    loading
  } = useSubscription();
  
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleStartTrial = async () => {
    setActionLoading('startTrial');
    try {
      const result = await startTrial();
      if (result.success) {
        toast({
          title: "Trial Started!",
          description: "Your 30-day free trial has begun. Enjoy full access to all features.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to start trial",
          variant: "destructive",
        });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpgrade = async () => {
    setActionLoading('upgrade');
    try {
      const result = await upgradeToPaid();
      if (result.success) {
        toast({
          title: "Subscription Activated!",
          description: "Your trial has been upgraded to a paid subscription.",
        });
        // Wait a moment for database to update, then refresh subscription state
        await new Promise(resolve => setTimeout(resolve, 1000));
        await refresh();
        
        // Navigate to refresh the page and ensure clean state
        navigate('/billing-security', { replace: true });
      } else {
        let errorMessage = result.error || "Failed to upgrade subscription";
        
        // Check for specific error types
        if (result.error?.includes("zero properties")) {
          errorMessage = "Cannot upgrade: Our billing system hasn't detected any properties in your account yet. Please wait a moment for the system to sync, or try adding a property first.";
        } else if (result.error?.includes("payment method") || result.error?.includes("payment source")) {
          errorMessage = "A payment method is required to upgrade. Please add a payment method to continue.";
        }
        
        toast({
          title: "Upgrade Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleManageTrial = () => {
    navigate('/billing/manage');
  };

  const handleAddProperty = () => {
    navigate('/properties');
  };

  const features = [
    {
      icon: Building,
      title: "Unlimited Properties",
      description: "Add and manage all your properties in one place"
    },
    {
      icon: Users,
      title: "Contractor Management",
      description: "Invite and manage contractors for your properties"
    },
    {
      icon: Zap,
      title: "Real-time Updates",
      description: "Get instant notifications on maintenance progress"
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Enterprise-grade security for your property data"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-muted-foreground">
            Manage your subscription and billing preferences
          </p>
        </div>

        {/* Phase 1 Debug Panel - Remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <SubscriptionStatusDebugger />
        )}

        {/* Trial Status Banner */}
        <TrialStatusBanner 
          onUpgrade={handleUpgrade}
          onManageTrial={handleManageTrial}
        />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Property Count Display */}
          <PropertyCountDisplay 
            onAddProperty={handleAddProperty}
            showTrend={true}
          />

          {/* Billing Preview */}
          <BillingPreview showDetails={true} />

          {/* Current Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Current Plan
              </CardTitle>
              <CardDescription>
                Your subscription status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscribed && !isTrialActive ? (
                <>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Active Subscription
                  </Badge>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plan</span>
                      <span>Property-Based</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Properties</span>
                      <span>{propertyCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monthly</span>
                      <span>{currency?.toUpperCase()} ${monthlyAmount}</span>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full"
                    onClick={handleManageTrial}
                  >
                    Cancel Subscription
                  </Button>
                </>
              ) : isTrialActive ? (
                <>
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    Free Trial
                  </Badge>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Days left</span>
                      <span className="font-medium">{daysRemaining}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Properties</span>
                      <span>{propertyCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">After trial</span>
                      <span>{currency?.toUpperCase()} ${monthlyAmount}/month</span>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={handleUpgrade}
                    disabled={actionLoading === 'upgrade'}
                  >
                    {actionLoading === 'upgrade' ? (
                      <>
                        <Clock className="h-3 w-3 mr-1 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-3 w-3 mr-1" />
                        Upgrade Now
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Badge variant="outline">No Subscription</Badge>
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      Start your free trial to access all features
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={handleStartTrial}
                    disabled={actionLoading === 'startTrial'}
                  >
                    {actionLoading === 'startTrial' ? (
                      <>
                        <Clock className="h-3 w-3 mr-1 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Star className="h-3 w-3 mr-1" />
                        Start Free Trial
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>What's Included</CardTitle>
            <CardDescription>
              Everything you need to manage your properties effectively
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <feature.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-600 mt-1" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pricing Information */}
        <Card>
          <CardHeader>
            <CardTitle>Simple, Transparent Pricing</CardTitle>
            <CardDescription>
              Pay only for what you use, scale as you grow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold">$29 <span className="text-base font-normal text-muted-foreground">AUD</span></div>
                <p className="text-sm text-muted-foreground">per property, per month</p>
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>✓ 30-day free trial</span>
                <Badge variant="secondary">Free</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>✓ No setup fees</span>
                <Badge variant="secondary">Free</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>✓ Cancel anytime</span>
                <Badge variant="secondary">Flexible</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>✓ Pro-rated billing</span>
                <Badge variant="secondary">Fair</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};