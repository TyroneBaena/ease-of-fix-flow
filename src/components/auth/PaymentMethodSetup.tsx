import React, { useState, useEffect, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const stripePromise = loadStripe('pk_test_51RvCRkERrSyHgYuuVYKfaGpq95rXEdqPsJqpBiBbyLz3vhb0sNaohYoLT7Fi1mYF9ox5kyrJgtLqOs0tdIgUeICb00zSDCxUXs');

interface PaymentMethodSetupFormProps {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const PaymentMethodSetupForm: React.FC<PaymentMethodSetupFormProps> = ({
  clientSecret,
  onSuccess,
  onCancel,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/billing?setup=success`,
        },
        redirect: 'if_required',
      });

      if (submitError) {
        setError(submitError.message || 'Failed to setup payment method');
        setProcessing(false);
        return;
      }

      // Payment method successfully added
      onSuccess();
    } catch (err) {
      console.error('Payment setup error:', err);
      setError('An unexpected error occurred');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1"
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Confirm & Start Trial
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={processing}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
};

interface PaymentMethodSetupProps {
  onComplete: () => void;
  onSkip?: () => void;
}

/**
 * Phase 1: Payment Method Validation at Signup
 * Requires payment method before activating trial
 */
export const PaymentMethodSetup: React.FC<PaymentMethodSetupProps> = ({
  onComplete,
  onSkip,
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [initialized, setInitialized] = useState(false);

  console.log('🔵 PaymentMethodSetup render:', { loading, error, setupComplete, clientSecret: !!clientSecret, initialized });

  // Memoize the Stripe Elements options to prevent re-creation - MUST be before conditional returns
  const stripeOptions = useMemo(() => {
    console.log('🟡 Creating stripeOptions with clientSecret:', !!clientSecret);
    return {
      clientSecret: clientSecret || '',
      appearance: {
        theme: 'stripe' as const,
      },
    };
  }, [clientSecret]);

  useEffect(() => {
    // Prevent re-initialization
    if (initialized) {
      console.log('🟠 Skipping initialization - already initialized');
      return;
    }

    let mounted = true;
    console.log('🟢 Starting payment setup initialization');
    
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (mounted) {
            console.log('🔴 No session found');
            setError('Please log in to continue');
            setLoading(false);
          }
          return;
        }

        console.log('🟢 Calling add-payment-method function');
        const { data, error: functionError } = await supabase.functions.invoke(
          'add-payment-method',
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (functionError) {
          throw functionError;
        }

        if (!data?.client_secret) {
          throw new Error('Failed to initialize payment setup');
        }

        if (mounted) {
          console.log('🟢 Successfully got client_secret');
          setClientSecret(data.client_secret);
          setLoading(false);
          setInitialized(true);
        }
      } catch (err) {
        console.error('🔴 Error initializing payment setup:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize payment setup');
          setLoading(false);
        }
      }
    };
    
    init();
    
    return () => {
      console.log('🔴 PaymentMethodSetup cleanup');
      mounted = false;
    };
  }, [initialized]);

  const initializeSetupIntent = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please log in to continue');
        setLoading(false);
        return;
      }

      const { data, error: functionError } = await supabase.functions.invoke(
        'add-payment-method',
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (functionError) {
        throw functionError;
      }

      if (!data?.client_secret) {
        throw new Error('Failed to initialize payment setup');
      }

      setClientSecret(data.client_secret);
      setLoading(false);
    } catch (err) {
      console.error('Error initializing payment setup:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize payment setup');
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    console.log('🟢 Payment setup successful!');
    setSetupComplete(true);
    
    // Call confirm-payment-method to save the payment method ID
    const confirmPaymentMethod = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { error } = await supabase.functions.invoke(
          'confirm-payment-method',
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (error) {
          console.error('Failed to confirm payment method:', error);
        } else {
          console.log('🟢 Payment method ID saved to database');
        }
      } catch (err) {
        console.error('Error confirming payment method:', err);
      }
    };

    confirmPaymentMethod();
    
    setTimeout(() => {
      console.log('🟢 Calling onComplete callback');
      onComplete();
    }, 2000);
  };

  if (loading) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Setup Error
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={initializeSetupIntent} className="w-full">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (setupComplete) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <CheckCircle className="h-16 w-16 text-green-600" />
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold">Payment Method Added!</h3>
            <p className="text-sm text-muted-foreground">
              Redirecting to your dashboard...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Add Payment Method
        </CardTitle>
        <CardDescription>
          Start your 30-day free trial. You won't be charged until the trial ends.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertDescription>
            <strong>No charge today.</strong> Your free trial starts now. We'll only charge you after 30 days.
          </AlertDescription>
        </Alert>

        {clientSecret && (
          <Elements
            stripe={stripePromise}
            options={stripeOptions}
          >
            <PaymentMethodSetupForm
              clientSecret={clientSecret}
              onSuccess={handleSuccess}
              onCancel={() => onSkip?.()}
            />
          </Elements>
        )}
      </CardContent>
    </Card>
  );
};
