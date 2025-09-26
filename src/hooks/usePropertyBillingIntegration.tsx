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

  // Show billing notifications when properties are added during trial/subscription
  useEffect(() => {
    const currentPropertyCount = properties.length;
    const previousPropertyCount = propertyCount || 0;

    // If property count increased and user is on trial or subscribed
    if (currentPropertyCount > previousPropertyCount && (isTrialActive || subscribed)) {
      const newPropertiesAdded = currentPropertyCount - previousPropertyCount;
      const newMonthlyAmount = currentPropertyCount * 29;

      if (isTrialActive) {
        toast.info(
          `Property added! Your billing after trial will be $${newMonthlyAmount}/month for ${currentPropertyCount} ${currentPropertyCount === 1 ? 'property' : 'properties'}.`,
          { duration: 5000 }
        );
      } else if (subscribed) {
        toast.info(
          `Property added! Your next billing cycle will include $${newPropertiesAdded * 29} for the new ${newPropertiesAdded === 1 ? 'property' : 'properties'}.`,
          { duration: 5000 }
        );
      }
    }
  }, [properties.length, propertyCount, isTrialActive, subscribed, monthlyAmount]);

  return {
    propertyCount: properties.length,
    billingAmount: properties.length * 29,
    currency: 'AUD'
  };
};