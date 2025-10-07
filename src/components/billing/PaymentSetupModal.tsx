import React, { useState, useEffect, useRef } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { createPortal } from 'react-dom';

// Stripe promise created once at module level
const stripePromise = loadStripe('pk_test_51RvCRkERrSyHgYuuVYKfaGpq95rXEdqPsJqpBiBbyLz3vhb0sNaohYoLT7Fi1mYF9ox5kyrJgtLqOs0tdIgUeICb00zSDCxUXs');

interface PaymentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ onSuccess, onCancel }) => {
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

interface PaymentSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const PaymentSetupModal: React.FC<PaymentSetupModalProps> = ({ isOpen, onClose, onComplete }) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const hasInitialized = useRef(false);

  // Initialize only when modal opens for the first time
  useEffect(() => {
    if (!isOpen || hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;
    setLoading(true);

    const init = async () => {
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

    init();
  }, [isOpen]);

  const handleSuccess = () => {
    setSetupComplete(true);
    setTimeout(() => {
      onComplete();
      // Reset for next time
      hasInitialized.current = false;
      setClientSecret(null);
      setSetupComplete(false);
      setLoading(false);
      setError(null);
    }, 2000);
  };

  const handleClose = () => {
    onClose();
    // Reset for next time
    setTimeout(() => {
      hasInitialized.current = false;
      setClientSecret(null);
      setSetupComplete(false);
      setLoading(false);
      setError(null);
    }, 300);
  };

  if (!isOpen) {
    return null;
  }

  const elementsOptions: StripeElementsOptions = {
    clientSecret: clientSecret || '',
    appearance: {
      theme: 'stripe' as const,
    },
  };

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        {loading && (
          <Card className="max-w-md mx-auto">
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        )}

        {error && !loading && (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Setup Error
              </CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleClose} className="w-full">
                Close
              </Button>
            </CardContent>
          </Card>
        )}

        {setupComplete && !loading && (
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
        )}

        {clientSecret && !loading && !error && !setupComplete && (
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

              <Elements
                stripe={stripePromise}
                options={elementsOptions}
              >
                <PaymentForm
                  onSuccess={handleSuccess}
                  onCancel={handleClose}
                />
              </Elements>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
