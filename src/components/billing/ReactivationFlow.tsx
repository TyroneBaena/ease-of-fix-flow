import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Clock, CreditCard, RefreshCw } from 'lucide-react';
import { useSubscription } from '@/contexts/subscription/SubscriptionContext';
import { useToast } from '@/hooks/use-toast';

interface ReactivationFlowProps {
  onComplete?: () => void;
}

export const ReactivationFlow: React.FC<ReactivationFlowProps> = ({ onComplete }) => {
  const { toast } = useToast();
  const { reactivateSubscription, propertyCount, monthlyAmount, currency } = useSubscription();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleReactivate = async () => {
    setIsProcessing(true);
    try {
      const result = await reactivateSubscription();
      if (result.success) {
        setIsCompleted(true);
        toast({
          title: "Subscription Reactivated!",
          description: "Welcome back! Your subscription is now active.",
        });
        // Wait longer for UI to show success before closing
        setTimeout(() => {
          onComplete?.();
        }, 2000);
      } else {
        toast({
          title: "Reactivation Failed",
          description: result.error || "Unable to reactivate subscription.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isCompleted) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6 text-center space-y-4">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
          <div>
            <h3 className="font-medium">Welcome Back!</h3>
            <p className="text-sm text-muted-foreground">
              Your subscription has been reactivated successfully.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Reactivate Your Subscription
        </CardTitle>
        <CardDescription>
          Continue where you left off with full access to all features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <h4 className="font-medium">Subscription Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Properties</span>
              <span>{propertyCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monthly Cost</span>
              <span>{currency?.toUpperCase()} ${monthlyAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Billing Frequency</span>
              <span>Monthly</span>
            </div>
          </div>
        </div>

        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Your subscription will be reactivated immediately and billing will resume on your next cycle.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={handleReactivate}
          disabled={isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Reactivating...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Reactivate Subscription
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};