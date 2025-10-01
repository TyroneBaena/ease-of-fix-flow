import { useEffect, useRef } from 'react';
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

  // Recalculate billing when properties change (debounced to prevent infinite loops)
  useEffect(() => {
    const updateBillingFromProperties = async () => {
      try {
        // Only refresh if there's an actual change in property count
        if (properties.length !== propertyCount) {
          await refreshPropertyCount();
          
          // Recalculate billing if user has subscription or trial
          if (isTrialActive || subscribed) {
            await calculateBilling();
          }
        }
      } catch (error) {
        console.error('Error updating billing from properties:', error);
      }
    };

    // Debounce the update to prevent infinite loops
    const timeoutId = setTimeout(updateBillingFromProperties, 100);
    return () => clearTimeout(timeoutId);
  }, [properties.length, propertyCount, isTrialActive, subscribed]);

  // Track if this is the initial mount to avoid false notifications
  const isInitialMount = useRef(true);
  const lastKnownCount = useRef<number | null>(null);

  // Show billing notifications when properties are added/removed during trial/subscription
  useEffect(() => {
    const currentPropertyCount = properties.length;

    // Skip on initial mount - just record the count
    if (isInitialMount.current) {
      isInitialMount.current = false;
      lastKnownCount.current = currentPropertyCount;
      return;
    }

    // Skip if no previous count or no actual change
    if (lastKnownCount.current === null || currentPropertyCount === lastKnownCount.current) {
      return;
    }

    const countChange = currentPropertyCount - lastKnownCount.current;
    lastKnownCount.current = currentPropertyCount;

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