import React, { useEffect, useMemo, useCallback } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { usePaymentSetup } from '@/hooks/usePaymentSetup';
import { STRIPE_CONFIG } from '@/config/stripe';

// Stripe promise created once at module level using centralized config
const stripePromise = loadStripe(STRIPE_CONFIG.publishableKey);

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
        console.error('[PaymentForm] Stripe error:', submitError);
        setError(submitError.message || 'Failed to setup payment method');
        setProcessing(false);
        return;
      }

      console.log('[PaymentForm] Payment setup confirmed successfully');
      onSuccess();
    } catch (err) {
      console.error('[PaymentForm] Unexpected error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
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
  
  // Store callbacks in refs to avoid them as dependencies
  const onCloseRef = React.useRef(onClose);
  const onCompleteRef = React.useRef(onComplete);
  const initializeRef = React.useRef(initialize);
  const resetRef = React.useRef(reset);
  const setCompleteRef = React.useRef(setComplete);
  
  // Keep refs updated - run only when props/functions change
  React.useEffect(() => {
    onCloseRef.current = onClose;
    onCompleteRef.current = onComplete;
    initializeRef.current = initialize;
    resetRef.current = reset;
    setCompleteRef.current = setComplete;
  }, [onClose, onComplete, initialize, reset, setComplete]);

  // Track previous isOpen state to detect true open/close transitions
  const prevIsOpenRef = React.useRef(isOpen);
  
  // Initialize ONLY when modal transitions from closed to open
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    const isNowOpen = isOpen;
    
    if (!wasOpen && isNowOpen) {
      // Modal just opened
      console.log('[PaymentModal] Modal opened, triggering initialization...');
      initializeRef.current();
    } else if (wasOpen && !isNowOpen) {
      // Modal just closed
      console.log('[PaymentModal] Modal closed, resetting...');
      resetRef.current();
    }
    
    // Update previous state
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Track if success has been called to prevent duplicate calls
  const successCalledRef = React.useRef(false);

  const handleSuccess = useCallback(() => {
    if (successCalledRef.current) {
      console.log('[PaymentModal] Success already called, ignoring duplicate');
      return;
    }
    successCalledRef.current = true;
    console.log('[PaymentModal] Payment setup successful, showing success state');
    setCompleteRef.current();
    
    // Call confirm-payment-method to save the payment method ID
    const confirmPaymentMethod = async () => {
      try {
        const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
        if (!session) return;

        const { error } = await (await import('@/lib/supabase')).supabase.functions.invoke(
          'confirm-payment-method',
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (error) {
          console.error('[PaymentModal] Failed to confirm payment method:', error);
        } else {
          console.log('[PaymentModal] Payment method ID saved to database');
        }
      } catch (err) {
        console.error('[PaymentModal] Error confirming payment method:', err);
      }
    };

    confirmPaymentMethod();
    
    // Show success message for 2 seconds, then close and trigger completion
    setTimeout(() => {
      console.log('[PaymentModal] Closing modal and triggering completion callback');
      onCloseRef.current(); // Close the modal first
      setTimeout(() => {
        onCompleteRef.current(); // Then trigger the completion callback
        successCalledRef.current = false; // Reset for next time
      }, 100);
    }, 2000);
  }, []); // NO dependencies

  const handleClose = useCallback(() => {
    console.log('[PaymentModal] User closed modal');
    onCloseRef.current();
  }, []); // NO dependencies

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
