import { useSubscription } from '@/contexts/subscription/SubscriptionContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface PropertyAccessControl {
  canCreateProperty: boolean;
  canDeleteProperty: boolean;
  canUpdateProperty: boolean;
  showTrialExpiredWarning: boolean;
  showCancelledWarning: boolean;
  showReactivationPrompt: boolean;
  getAccessMessage: () => string;
  handleRestrictedAction: (action: string) => void;
}

export const usePropertyAccessControl = (): PropertyAccessControl => {
  const { 
    subscribed, 
    isTrialActive, 
    isCancelled, 
    daysRemaining,
    loading 
  } = useSubscription();
  const navigate = useNavigate();

  // Determine access level based on subscription status
  const canCreateProperty = !loading && (subscribed || isTrialActive);
  const canDeleteProperty = !loading && (subscribed || isTrialActive);
  const canUpdateProperty = !loading && (subscribed || isTrialActive);
  
  // Warning states
  const showTrialExpiredWarning = !loading && !subscribed && !isTrialActive && !isCancelled;
  const showCancelledWarning = !loading && isCancelled;
  const showReactivationPrompt = !loading && isCancelled;

  const getAccessMessage = (): string => {
    if (loading) return "Loading subscription status...";
    
    if (isCancelled) {
      return "Your subscription has been cancelled. Reactivate to continue managing properties.";
    }
    
    if (!isTrialActive && !subscribed) {
      return "Your trial has expired. Upgrade to continue managing properties.";
    }
    
    if (isTrialActive && daysRemaining !== null && daysRemaining <= 3) {
      return `Your trial expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Upgrade to continue access.`;
    }
    
    return "You have full access to property management.";
  };

  const handleRestrictedAction = (action: string) => {
    if (loading) return;
    
    if (isCancelled) {
      toast.error("Your subscription is cancelled. Please reactivate to continue.", {
        action: {
          label: "Reactivate",
          onClick: () => navigate('/billing')
        },
        duration: 6000
      });
      return;
    }
    
    if (!isTrialActive && !subscribed) {
      toast.error("Your trial has expired. Please upgrade to continue.", {
        action: {
          label: "Upgrade Now",
          onClick: () => navigate('/pricing')
        },
        duration: 6000
      });
      return;
    }
    
    // Fallback message
    toast.error(`Unable to ${action}. Please check your subscription status.`);
  };

  return {
    canCreateProperty,
    canDeleteProperty,
    canUpdateProperty,
    showTrialExpiredWarning,
    showCancelledWarning,
    showReactivationPrompt,
    getAccessMessage,
    handleRestrictedAction
  };
};