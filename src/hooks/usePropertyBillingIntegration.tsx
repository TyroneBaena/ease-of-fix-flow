import { useEffect } from 'react';
import { useSubscription } from '@/contexts/subscription/SubscriptionContext';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const usePropertyBillingIntegration = () => {
  const { 
    refreshPropertyCount, 
    calculateBilling, 
    isTrialActive, 
    subscribed,
    propertyCount,
    monthlyAmount 
  } = useSubscription();
  const { properties } = usePropertyContext();
  const { currentUser } = useUserContext();

  // Recalculate billing when properties change
  useEffect(() => {
    const updateBillingFromProperties = async () => {
      try {
        // Refresh property count in subscription context
        await refreshPropertyCount();
        
        // Recalculate billing if user has subscription or trial
        if (isTrialActive || subscribed) {
          await calculateBilling();
        }
      } catch (error) {
        console.error('Error updating billing from properties:', error);
      }
    };

    updateBillingFromProperties();
  }, [properties.length, refreshPropertyCount, calculateBilling, isTrialActive, subscribed]);

  // Show billing notifications when properties are added/removed during trial/subscription
  useEffect(() => {
    const currentPropertyCount = properties.length;
    const previousPropertyCount = propertyCount || 0;

    // Skip notifications on initial load or when no change
    if (previousPropertyCount === 0 || currentPropertyCount === previousPropertyCount) {
      return;
    }

    const countChange = currentPropertyCount - previousPropertyCount;
    const newMonthlyAmount = currentPropertyCount * 29;

    const sendBillingNotification = async (changeType: 'added' | 'removed', propertiesChanged: number) => {
      if (!currentUser?.email) return;

      try {
        await supabase.functions.invoke('send-billing-notification', {
          body: {
            recipient_email: currentUser.email,
            recipient_name: currentUser.name || currentUser.email.split('@')[0],
            property_count: currentPropertyCount,
            monthly_amount: newMonthlyAmount,
            change_type: changeType,
            properties_changed: propertiesChanged,
            is_trial: isTrialActive || false,
            is_subscribed: subscribed || false
          }
        });
        console.log(`Billing notification email sent for ${changeType} properties`);
      } catch (error) {
        console.error('Failed to send billing notification email:', error);
      }
    };

    if (countChange > 0 && (isTrialActive || subscribed)) {
      // Property added
      const addedCount = countChange;
      
      // Send email notification
      sendBillingNotification('added', addedCount);
      
      if (isTrialActive) {
        toast.info(
          `🏢 Property added! Your billing after trial will be $${newMonthlyAmount} AUD/month for ${currentPropertyCount} ${currentPropertyCount === 1 ? 'property' : 'properties'}. Check your email for details.`,
          { duration: 6000 }
        );
      } else if (subscribed) {
        toast.info(
          `🏢 Property added! Your next billing cycle will include $${addedCount * 29} AUD for the new ${addedCount === 1 ? 'property' : 'properties'}. Check your email for details.`,
          { duration: 6000 }
        );
      }
    } else if (countChange < 0 && (isTrialActive || subscribed)) {
      // Property removed
      const removedCount = Math.abs(countChange);
      
      // Send email notification
      sendBillingNotification('removed', removedCount);
      
      if (isTrialActive) {
        toast.info(
          `🏢 Property removed! Your billing after trial will be $${newMonthlyAmount} AUD/month for ${currentPropertyCount} ${currentPropertyCount === 1 ? 'property' : 'properties'}. Check your email for details.`,
          { duration: 6000 }
        );
      } else if (subscribed) {
        toast.info(
          `🏢 Property removed! Your billing will decrease by $${removedCount * 29} AUD starting next cycle. Check your email for details.`,
          { duration: 6000 }
        );
      }
    }
  }, [properties.length, propertyCount, isTrialActive, subscribed, currentUser]);

  return {
    propertyCount: properties.length,
    billingAmount: properties.length * 29,
    currency: 'AUD'
  };
};