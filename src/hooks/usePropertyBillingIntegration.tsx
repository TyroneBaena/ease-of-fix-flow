import { useEffect } from 'react';
import { useSubscription } from '@/contexts/subscription/SubscriptionContext';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
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

    if (countChange > 0 && (isTrialActive || subscribed)) {
      // Property added
      const addedCount = countChange;
      
      if (isTrialActive) {
        toast.info(
          `🏢 Property added! Your billing after trial will be $${newMonthlyAmount} AUD/month for ${currentPropertyCount} ${currentPropertyCount === 1 ? 'property' : 'properties'}.`,
          { duration: 6000 }
        );
      } else if (subscribed) {
        toast.info(
          `🏢 Property added! Your next billing cycle will include $${addedCount * 29} AUD for the new ${addedCount === 1 ? 'property' : 'properties'}.`,
          { duration: 6000 }
        );
      }
    } else if (countChange < 0 && (isTrialActive || subscribed)) {
      // Property removed
      const removedCount = Math.abs(countChange);
      
      if (isTrialActive) {
        toast.info(
          `🏢 Property removed! Your billing after trial will be $${newMonthlyAmount} AUD/month for ${currentPropertyCount} ${currentPropertyCount === 1 ? 'property' : 'properties'}.`,
          { duration: 6000 }
        );
      } else if (subscribed) {
        toast.info(
          `🏢 Property removed! Your billing will decrease by $${removedCount * 29} AUD starting next cycle.`,
          { duration: 6000 }
        );
      }
    }
  }, [properties.length, propertyCount, isTrialActive, subscribed]);

  return {
    propertyCount: properties.length,
    billingAmount: properties.length * 29,
    currency: 'AUD'
  };
};