import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { STRIPE_CONFIG } from '@/config/stripe';

const stripePromise = loadStripe(STRIPE_CONFIG.publishableKey);

interface PaymentFormProps {
  clientSecret: string;
  onSuccess: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ clientSecret, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);

    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/billing`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast.error(error.message || 'Payment setup failed');
      } else {
        onSuccess();
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button type="submit" disabled={!stripe || processing} className="w-full">
        {processing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4 mr-2" />
            Save Payment Method
          </>
        )}
      </Button>
    </form>
  );
};

interface PaymentMethodSetupProps {
  onComplete: (success: boolean) => void;
  onError?: (error: string) => void;
}

export const PaymentMethodSetup: React.FC<PaymentMethodSetupProps> = ({ 
  onComplete, 
  onError 
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    createSetupIntent();
  }, []);

  const createSetupIntent = async () => {
    try {
      // Note: This is now only called from the old EnhancedSignupFlow
      // The new OrganizationOnboarding flow doesn't use this component for setup intent creation
      // It uses PaymentCompletionHandler which calls the edge function with organization_id
      
      const { data, error } = await supabase.functions.invoke('create-trial-subscription', {
        body: {}
      });

      if (error) throw error;

      if (data?.client_secret) {
        setClientSecret(data.client_secret);
      } else {
        throw new Error('No client secret returned');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to initialize payment setup';
      toast.error(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setSuccess(true);
    toast.success('Payment method added successfully');
    
    // Notify parent component of successful payment
    setTimeout(() => {
      onComplete(true);
    }, 1500);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Add Payment Method</CardTitle>
        <CardDescription>
          Securely add your payment information to start your free trial
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info Alert */}
        <Alert>
          <CreditCard className="h-4 w-4" />
          <AlertDescription>
            Your card will not be charged immediately. You can upgrade to a paid plan anytime during or after your trial.
          </AlertDescription>
        </Alert>

        {/* Payment Form */}
        {success ? (
          <div className="text-center space-y-4 py-8">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Payment Method Added</h3>
              <p className="text-sm text-muted-foreground">
                Setting up your account...
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm clientSecret={clientSecret} onSuccess={handleSuccess} />
          </Elements>
        ) : (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to initialize payment setup. Please try again.
            </AlertDescription>
          </Alert>
        )}


        {/* Security Notice */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            🔒 Your payment information is encrypted and securely processed by Stripe.
            We never store your card details on our servers.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
