import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, CreditCard, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();

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
          return_url: `${window.location.origin}/billing-security`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: 'Payment Setup Failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
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

const PaymentMethodSetup: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    createSetupIntent();
  }, []);

  const createSetupIntent = async () => {
    try {
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
      toast({
        title: 'Setup Failed',
        description: error.message || 'Failed to initialize payment setup',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setSuccess(true);
    toast({
      title: 'Payment Method Added',
      description: 'Your payment method has been saved successfully.',
    });
    
    setTimeout(() => {
      navigate('/billing-security');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/billing-security')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Billing
          </Button>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Add Payment Method</h1>
          <p className="text-muted-foreground">
            Securely add your payment information
          </p>
        </div>

        {/* Info Alert */}
        <Alert>
          <CreditCard className="h-4 w-4" />
          <AlertDescription>
            Your card will not be charged immediately. You can upgrade to a paid plan anytime during or after your trial.
          </AlertDescription>
        </Alert>

        {/* Payment Form */}
        {success ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-green-100 p-3">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Payment Method Added</h3>
                  <p className="text-sm text-muted-foreground">
                    Redirecting you back to billing...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
              <CardDescription>
                Add a credit or debit card to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
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
            </CardContent>
          </Card>
        )}

        {/* Security Notice */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            🔒 Your payment information is encrypted and securely processed by Stripe.
            We never store your card details on our servers.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodSetup;
