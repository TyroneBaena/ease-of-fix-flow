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
  loading: boolean;
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
  // CRITICAL: Allow access during loading OR if subscribed/trial is active
  // Also allow access if both subscribed and isTrialActive are null (new user, no subscriber record yet)
  const hasActiveAccess = subscribed === true || isTrialActive === true;
  const isNewUser = subscribed === null && isTrialActive === null && !trialEndDate;
  
  const canCreateProperty = loading || hasActiveAccess || isNewUser;
  const canDeleteProperty = loading || hasActiveAccess || isNewUser;
  const canUpdateProperty = loading || hasActiveAccess || isNewUser;
  
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
          onClick: () => navigate('/settings')
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
            onClick: () => navigate('/settings')
          },
          duration: 6000
        });
      } else {
        toast.error("Your trial has expired. Please upgrade to continue.", {
          action: {
            label: "Go to Billing",
            onClick: () => navigate('/settings')
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
    loading,
    getAccessMessage,
    handleRestrictedAction
  };
};