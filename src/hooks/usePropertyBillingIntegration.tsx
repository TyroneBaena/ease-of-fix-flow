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
          
          // Use metered billing calculation if user has subscription or trial
          if (isTrialActive || subscribed) {
            try {
              console.log('Calling calculate-billing-metered...');
              
              // Supabase automatically includes the auth token, no need to manually add it
              const { data, error } = await supabase.functions.invoke('calculate-billing-metered');

              if (error) {
                console.error('Error calculating metered billing:', error);
              } else {
                console.log('Metered billing updated successfully:', data);
              }
            } catch (err) {
              console.error('Exception in metered billing calculation:', err);
            }
          }
        }
      } catch (error) {
        console.error('Error updating billing from properties:', error);
      }
    };

    // Debounce the update to prevent infinite loops
    const timeoutId = setTimeout(updateBillingFromProperties, 500);
    return () => clearTimeout(timeoutId);
  }, [properties.length, propertyCount, isTrialActive, subscribed]);

  // Track property count changes - only trigger notifications for real user actions
  const lastKnownCount = useRef<number>(properties.length);
  const hasInitialized = useRef(false);

  // Initialize the count after properties have loaded
  useEffect(() => {
    if (!hasInitialized.current && properties.length > 0) {
      hasInitialized.current = true;
      lastKnownCount.current = properties.length;
    }
  }, [properties.length]);

  // Show billing notifications when properties are added/removed during trial/subscription
  useEffect(() => {
    const currentPropertyCount = properties.length;

    // Don't trigger on initial load or before properties have loaded
    if (!hasInitialized.current || currentPropertyCount === lastKnownCount.current) {
      return;
    }

    const countChange = currentPropertyCount - lastKnownCount.current;
    lastKnownCount.current = currentPropertyCount;

    const newMonthlyAmount = currentPropertyCount * 29;

    const sendBillingNotification = async (
      changeType: 'added' | 'removed', 
      propertiesChanged: number,
      oldAmount: number
    ) => {
      if (!currentUser?.email) return;

      try {
        // Get accurate proration preview from Stripe
        let proratedAmount: number | undefined;
        let nextBillingDate: Date | undefined;

        if (subscribed) {
          const { data: previewData } = await supabase.functions.invoke('preview-billing-change', {
            body: { newPropertyCount: currentPropertyCount }
          });

          if (previewData?.success) {
            proratedAmount = previewData.prorated_amount;
            nextBillingDate = previewData.next_invoice_date ? new Date(previewData.next_invoice_date) : undefined;
          }
        }

        if (!nextBillingDate) {
          const today = new Date();
          nextBillingDate = new Date(today);
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        }

        await supabase.functions.invoke('send-property-billing-update', {
          body: {
            recipient_email: currentUser.email,
            recipient_name: currentUser.name || currentUser.email.split('@')[0],
            property_count: currentPropertyCount,
            old_property_count: lastKnownCount.current,
            monthly_amount: newMonthlyAmount,
            old_monthly_amount: oldAmount,
            change_type: changeType,
            properties_changed: propertiesChanged,
            next_billing_date: nextBillingDate.toISOString(),
            prorated_amount: proratedAmount,
            is_trial: isTrialActive || false,
            is_subscribed: subscribed || false
          }
        });
        console.log(`Property billing update email sent for ${changeType} properties`);
      } catch (error) {
        console.error('Failed to send property billing update email:', error);
      }
    };

    if (countChange > 0 && (isTrialActive || subscribed)) {
      // Property added
      const addedCount = countChange;
      const oldAmount = lastKnownCount.current * 29;
      
      // Send enhanced email notification with proration details
      sendBillingNotification('added', addedCount, oldAmount);
      
      if (isTrialActive) {
        toast.info(
          `🏢 Property added! Your billing after trial will be $${newMonthlyAmount} AUD/month for ${currentPropertyCount} ${currentPropertyCount === 1 ? 'property' : 'properties'}. Check your email for full details.`,
          { duration: 6000 }
        );
      } else if (subscribed) {
        // Calculate approximate prorated charge
        const daysInMonth = 30;
        const today = new Date();
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const daysRemaining = Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const proratedCharge = ((addedCount * 29) / daysInMonth) * daysRemaining;
        
        toast.info(
          `🏢 Property added! Prorated charge of ~$${proratedCharge.toFixed(2)} AUD will be added to your next invoice. New monthly rate: $${newMonthlyAmount} AUD. Check your email for details.`,
          { duration: 8000 }
        );
      }
    } else if (countChange < 0 && (isTrialActive || subscribed)) {
      // Property removed
      const removedCount = Math.abs(countChange);
      const oldAmount = lastKnownCount.current * 29;
      
      // Send enhanced email notification with credit details
      sendBillingNotification('removed', removedCount, oldAmount);
      
      if (isTrialActive) {
        toast.info(
          `🏢 Property removed! Your billing after trial will be $${newMonthlyAmount} AUD/month for ${currentPropertyCount} ${currentPropertyCount === 1 ? 'property' : 'properties'}. Check your email for full details.`,
          { duration: 6000 }
        );
      } else if (subscribed) {
        // Calculate approximate credit
        const daysInMonth = 30;
        const today = new Date();
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const daysRemaining = Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const creditAmount = ((removedCount * 29) / daysInMonth) * daysRemaining;
        
        toast.info(
          `🏢 Property removed! Credit of ~$${creditAmount.toFixed(2)} AUD will be applied to your next invoice. New monthly rate: $${newMonthlyAmount} AUD. Check your email for details.`,
          { duration: 8000 }
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