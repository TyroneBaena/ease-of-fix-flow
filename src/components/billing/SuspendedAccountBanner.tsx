import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe('pk_test_51RvCRkERrSyHgYuuVYKfaGpq95rXEdqPsJqpBiBbyLz3vhb0sNaohYoLT7Fi1mYF9ox5kyrJgtLqOs0tdIgUeICb00zSDCxUXs');

interface SuspendedAccountBannerProps {
  failedCount: number;
  daysRemaining?: number | null;
}

/**
 * PHASE 4: Suspended Account Banner
 * Shows when user has 3 failed payment attempts
 * Provides "Update Payment Method" button to restore access
 */
export const SuspendedAccountBanner: React.FC<SuspendedAccountBannerProps> = ({ 
  failedCount,
  daysRemaining,
}) => {
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdatePaymentMethod = async () => {
    setIsUpdating(true);
    try {
      // Get subscriber details
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: subscriber } = await supabase
        .from('subscribers')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .single();

      if (!subscriber?.stripe_customer_id) {
        throw new Error('No Stripe customer found');
      }

      // Create Stripe Checkout session for updating payment method
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe not loaded');

      // Create setup intent for payment method update
      const { data: setupIntent, error: setupError } = await supabase.functions.invoke(
        'create-setup-intent',
        {
          body: { customer_id: subscriber.stripe_customer_id },
        }
      );

      if (setupError) throw setupError;

      // Open Stripe Checkout for payment method setup
      window.location.href = `/billing?setup=${setupIntent.client_secret}`;

    } catch (error: any) {
      console.error('Error updating payment method:', error);
      toast.error('Failed to open payment setup', {
        description: error.message,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReactivate = async () => {
    setIsUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('reactivate-subscription');

      if (error) throw error;

      toast.success('Account Reactivated!', {
        description: 'Your subscription has been restored. You now have full access.',
      });

      // Refresh the page to update subscription status
      window.location.reload();

    } catch (error: any) {
      console.error('Error reactivating subscription:', error);
      
      if (error.message?.includes('No payment method')) {
        toast.error('Payment Method Required', {
          description: 'Please add a valid payment method first.',
          action: {
            label: 'Add Payment Method',
            onClick: handleUpdatePaymentMethod,
          },
        });
      } else {
        toast.error('Reactivation Failed', {
          description: error.message,
        });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Alert variant="destructive" className="mb-6 border-red-500 bg-red-50">
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="text-lg font-semibold">
        Account Suspended - Immediate Action Required
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-sm">
          Your account has been suspended after {failedCount} failed payment attempts. 
          All features are currently disabled.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleUpdatePaymentMethod}
            disabled={isUpdating}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isUpdating ? 'Processing...' : 'Update Payment Method'}
          </Button>
          <Button
            onClick={handleReactivate}
            disabled={isUpdating}
            variant="outline"
            className="border-red-300 hover:bg-red-100"
          >
            Reactivate After Update
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Once you update your payment method, click "Reactivate" to restore immediate access.
        </p>
      </AlertDescription>
    </Alert>
  );
};