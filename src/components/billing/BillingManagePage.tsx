import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  AlertTriangle, 
  Clock,
  CreditCard,
  Calendar
} from 'lucide-react';
import { useSubscription } from '@/contexts/subscription/SubscriptionContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export const BillingManagePage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    subscribed,
    isTrialActive,
    daysRemaining,
    propertyCount,
    monthlyAmount,
    currency,
    cancelTrial,
    refresh,
    loading
  } = useSubscription();
  
  const [cancellationReason, setCancellationReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCancel = async () => {
    if (!cancellationReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for cancellation",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await cancelTrial(cancellationReason);
      if (result.success) {
        toast({
          title: "Subscription Cancelled",
          description: "Your subscription has been cancelled successfully",
        });
        await refresh();
        navigate('/settings');
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to cancel subscription",
          variant: "destructive",
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoBack = () => {
    navigate('/settings');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Billing
          </Button>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Manage Subscription</h1>
          <p className="text-muted-foreground">
            Cancel or modify your subscription
          </p>
        </div>

        {/* Current Subscription Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Status:</span>
                <div className="font-medium">
                  {subscribed && !isTrialActive ? 'Active Subscription' : 
                   isTrialActive ? 'Free Trial' : 'No Subscription'}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Properties:</span>
                <div className="font-medium">{propertyCount}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Monthly Cost:</span>
                <div className="font-medium">{currency?.toUpperCase()} ${monthlyAmount}</div>
              </div>
              {isTrialActive && (
                <div>
                  <span className="text-muted-foreground">Trial Days Left:</span>
                  <div className="font-medium">{daysRemaining}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cancellation Form */}
        {(subscribed || isTrialActive) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Cancel Subscription
              </CardTitle>
              <CardDescription>
                We're sorry to see you go. Please let us know why you're cancelling.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {isTrialActive 
                    ? "Cancelling will end your trial immediately and you'll lose access to all features."
                    : "Cancelling will end your subscription at the end of the current billing period."
                  }
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for cancellation</Label>
                <Textarea
                  id="reason"
                  placeholder="Please tell us why you're cancelling your subscription..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleGoBack}
                  className="flex-1"
                >
                  Keep Subscription
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={isProcessing || !cancellationReason.trim()}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Confirm Cancellation'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};