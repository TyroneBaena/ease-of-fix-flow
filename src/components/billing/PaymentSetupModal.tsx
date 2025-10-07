import React, { useEffect, useMemo, useCallback } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { usePaymentSetup } from '@/hooks/usePaymentSetup';

// Stripe promise created once at module level
const stripePromise = loadStripe('pk_test_51RvCRkERrSyHgYuuVYKfaGpq95rXEdqPsJqpBiBbyLz3vhb0sNaohYoLT7Fi1mYF9ox5kyrJgtLqOs0tdIgUeICb00zSDCxUXs');

interface PaymentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = React.memo(({ onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);

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
});

interface PaymentSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const PaymentSetupModal: React.FC<PaymentSetupModalProps> = ({ isOpen, onClose, onComplete }) => {
  const { state, clientSecret, error, initialize, reset, setComplete } = usePaymentSetup();

  // Initialize payment setup when modal opens
  useEffect(() => {
    if (isOpen && state === 'idle') {
      console.log('[PaymentModal] Modal opened, initializing...');
      initialize();
    }
  }, [isOpen, state, initialize]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      console.log('[PaymentModal] Modal closed, resetting...');
      reset();
    }
  }, [isOpen, reset]);

  const handleSuccess = useCallback(() => {
    console.log('[PaymentModal] Payment setup successful');
    setComplete();
    setTimeout(() => {
      onComplete();
    }, 2000);
  }, [onComplete, setComplete]);

  const handleClose = useCallback(() => {
    console.log('[PaymentModal] User closed modal');
    onClose();
  }, [onClose]);

  // Memoize elementsOptions to prevent unnecessary re-renders
  const elementsOptions: StripeElementsOptions | null = useMemo(() => {
    if (!clientSecret) return null;
    
    return {
      clientSecret,
      appearance: {
        theme: 'stripe' as const,
      },
    };
  }, [clientSecret]);

  // Don't render anything if modal is not open
  if (!isOpen) {
    return null;
  }

  const isLoading = state === 'initializing';
  const isComplete = state === 'complete';
  const isReady = state === 'ready';

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
        {isLoading && (
          <Card className="max-w-md mx-auto">
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        )}

        {error && !isLoading && (
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

        {isComplete && !isLoading && (
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

        {isReady && clientSecret && elementsOptions && !error && (
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
                key={clientSecret}
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
