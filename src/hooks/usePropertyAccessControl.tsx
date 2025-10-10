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
    trialEndDate,
    loading,
    refresh 
  } = useSubscription();
  const navigate = useNavigate();

  // Determine access level based on subscription status
  const canCreateProperty = !loading && (subscribed || isTrialActive);
  const canDeleteProperty = !loading && (subscribed || isTrialActive);
  const canUpdateProperty = !loading && (subscribed || isTrialActive);
  
  // Warning states - distinguish between "never started trial" vs "trial expired"
  const hasNeverStartedTrial = !trialEndDate;
  const hasExpiredTrial = trialEndDate && !isTrialActive;
  const showTrialExpiredWarning = !loading && !subscribed && hasExpiredTrial && !isCancelled;
  const showCancelledWarning = !loading && isCancelled;
  const showReactivationPrompt = !loading && isCancelled;

  const getAccessMessage = (): string => {
    if (loading) return "Loading subscription status...";
    
    if (isCancelled) {
      return "Your subscription has been cancelled. Reactivate to continue managing properties.";
    }
    
    if (!isTrialActive && !subscribed) {
      if (hasNeverStartedTrial) {
        return "Start your free trial to begin managing properties.";
      } else {
        return "Your trial has expired. Upgrade to continue managing properties.";
      }
    }
    
    if (isTrialActive && daysRemaining !== null && daysRemaining <= 3) {
      return `Your trial expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Upgrade to continue access.`;
    }
    
    return "You have full access to property management.";
  };

  const handleRestrictedAction = (action: string) => {
    if (loading) {
      toast.error("Loading subscription status, please wait...");
      return;
    }
    
    if (isCancelled) {
      toast.error("Your subscription is cancelled. Please reactivate to continue.", {
        action: {
          label: "Reactivate",
          onClick: () => navigate('/billing-security')
        },
        duration: 6000
      });
      return;
    }
    
    if (!isTrialActive && !subscribed) {
      if (hasNeverStartedTrial) {
        toast.error("Start your free trial to access property management.", {
          action: {
            label: "Start Trial",
            onClick: () => navigate('/billing-security')
          },
          duration: 6000
        });
      } else {
        toast.error("Your trial has expired. Please upgrade to continue.", {
          action: {
            label: "Upgrade Now",
            onClick: () => navigate('/pricing')
          },
          duration: 6000
        });
      }
      return;
    }
    
    // Network or other error - try refreshing subscription status
    toast.error("Unable to verify subscription status. Refreshing...", {
      action: {
        label: "Retry",
        onClick: () => {
          refresh();
          setTimeout(() => handleRestrictedAction(action), 1000);
        }
      },
      duration: 6000
    });
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