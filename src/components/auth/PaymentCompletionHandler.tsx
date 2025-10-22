import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SetupStep {
  id: string;
  name: string;
  status: 'pending' | 'in-progress' | 'success' | 'error';
  errorMessage?: string;
}

interface PaymentCompletionHandlerProps {
  user: any;
  organizationId: string; // BUG FIX 1: Receive org ID instead of creating it
  organizationName: string; // For display purposes only
  paymentCompleted: boolean;
  onCancel: () => void;
}

export const PaymentCompletionHandler: React.FC<PaymentCompletionHandlerProps> = ({
  user,
  organizationId: propOrgId,
  organizationName,
  paymentCompleted,
  onCancel
}) => {
  // BUG FIX 1: Organization already created, skip that step
  const [steps, setSteps] = useState<SetupStep[]>([
    { id: 'payment', name: 'Setting up payment method', status: 'success' },
    { id: 'organization', name: 'Creating your organization', status: 'success' }, // Already done
    { id: 'profile', name: 'Configuring your account', status: 'pending' },
    { id: 'membership', name: 'Setting up team access', status: 'pending' },
    { id: 'subscriber', name: 'Activating your free trial', status: 'pending' }
  ]);
  
  const [organizationId] = useState<string>(propOrgId); // Use provided org ID
  const [isRetrying, setIsRetrying] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [retryCount, setRetryCount] = useState(0); // Track retry attempts
  const MAX_RETRIES = 3;

  useEffect(() => {
    if (paymentCompleted && !setupComplete) {
      performSetup();
    }
  }, [paymentCompleted, setupComplete]);

  const updateStepStatus = (stepId: string, status: SetupStep['status'], errorMessage?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, errorMessage } : step
    ));
  };

  const performSetup = async () => {
    console.log('🚀 Starting post-payment setup with org ID:', organizationId);

    // BUG FIX 1: Organization already created, skip directly to profile/membership/trial
    try {
      await continueSetup(organizationId);
    } catch (error: any) {
      console.error('❌ Setup error:', error);
      toast.error('Setup failed. Please try again.');
    }
  };

  const continueSetup = async (orgId: string) => {
    // Step 2: Update User Profile with timeout
    updateStepStatus('profile', 'in-progress');
    
    try {
      // Refresh session to pick up any policy changes
      console.log('🔄 Refreshing session before profile update');
      await supabase.auth.refreshSession();
      
      // Add timeout to prevent hanging
      const profileUpdatePromise = supabase
        .from('profiles')
        .update({ 
          organization_id: orgId,
          session_organization_id: orgId,
          role: 'admin'
        })
        .eq('id', user.id);

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile update timed out. Please try again.')), 10000)
      );

      const { error: profileError } = await Promise.race([
        profileUpdatePromise,
        timeoutPromise
      ]) as any;

      if (profileError) {
        console.error('❌ Profile update failed:', profileError);
        updateStepStatus('profile', 'error', profileError.message);
        return;
      }

      console.log('✅ Profile updated');
      updateStepStatus('profile', 'success');
    } catch (error: any) {
      console.error('❌ Profile update exception:', error);
      updateStepStatus('profile', 'error', error.message);
      return;
    }

    // Step 3: Verify User Organization Membership (already created during org setup)
    updateStepStatus('membership', 'in-progress');
    
    try {
      // Verify membership exists
      const { data: existingMembership, error: membershipError } = await supabase
        .from('user_organizations')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', orgId)
        .maybeSingle();

      if (membershipError) {
        console.error('❌ Membership verification failed:', membershipError);
        updateStepStatus('membership', 'error', membershipError.message);
        return;
      }

      if (!existingMembership) {
        console.error('❌ Membership does not exist - should have been created during org setup');
        updateStepStatus('membership', 'error', 'Organization membership not found');
        return;
      }

      console.log('✅ Membership verified');
      updateStepStatus('membership', 'success');
    } catch (error: any) {
      console.error('❌ Membership verification exception:', error);
      updateStepStatus('membership', 'error', error.message);
      return;
    }

    // Step 4: Verify/Create Trial Subscription via Edge Function
    updateStepStatus('subscriber', 'in-progress');
    
    try {
      // Check if subscriber already exists
      const { data: existingSubscriber } = await supabase
        .from('subscribers')
        .select('is_trial_active, trial_start_date, stripe_customer_id')
        .eq('organization_id', orgId)
        .maybeSingle();

      if (existingSubscriber?.is_trial_active && existingSubscriber?.stripe_customer_id) {
        console.log('✅ Trial already active with Stripe customer');
        updateStepStatus('subscriber', 'success');
      } else {
        // Call edge function to create trial subscription with Stripe integration
        console.log('Calling create-trial-subscription edge function with org_id:', orgId);
        const { data: trialData, error: trialError } = await supabase.functions.invoke('create-trial-subscription', {
          body: { organization_id: orgId }
        });

        if (trialError) {
          console.error('❌ Edge function error:', trialError);
          updateStepStatus('subscriber', 'error', trialError.message);
          return;
        }

        if (!trialData?.success) {
          console.error('❌ Edge function returned error:', trialData);
          updateStepStatus('subscriber', 'error', trialData?.error || 'Failed to create trial');
          return;
        }

        console.log('✅ Trial activated via edge function', trialData);
        updateStepStatus('subscriber', 'success');
      }

      // All steps completed successfully!
      setSetupComplete(true);
      toast.success('Account setup completed successfully!');
      
      // Refresh auth to pick up changes
      await supabase.auth.updateUser({
        data: { last_organization_update: Date.now() }
      });

      // Navigate to dashboard after brief delay
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);

    } catch (error: any) {
      console.error('❌ Trial activation exception:', error);
      updateStepStatus('subscriber', 'error', error.message);
      return;
    }
  };

  const handleRetry = async () => {
    if (isRetrying) {
      console.log('Retry already in progress, ignoring duplicate request');
      return;
    }

    if (retryCount >= MAX_RETRIES) {
      toast.error(`Maximum retry attempts (${MAX_RETRIES}) reached. Please contact support.`);
      return;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    // Refresh auth session before retry to pick up any policy changes
    console.log('🔄 Refreshing auth session before retry');
    try {
      await supabase.auth.refreshSession();
      console.log('✅ Session refreshed');
    } catch (error) {
      console.error('⚠️ Session refresh failed:', error);
    }
    
    // Reset failed steps to pending (but keep organization as success since it's already created)
    setSteps(prev => prev.map(step => 
      step.status === 'error' && step.id !== 'organization' 
        ? { ...step, status: 'pending', errorMessage: undefined } 
        : step
    ));

    await performSetup();
    setIsRetrying(false);
  };

  const allStepsSuccessful = steps.every(step => step.status === 'success');
  const hasErrors = steps.some(step => step.status === 'error');
  const inProgress = steps.some(step => step.status === 'in-progress');

  // Calculate progress percentage
  const completedSteps = steps.filter(step => step.status === 'success').length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  // Get current step message
  const currentStep = steps.find(step => step.status === 'in-progress');
  const currentStepMessage = currentStep ? currentStep.name : 
    allStepsSuccessful ? 'Setup complete!' : 
    hasErrors ? 'Setup encountered an issue' : 'Preparing your account...';

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {setupComplete ? 'Setup Complete!' : 'Setting Up Your Account'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {hasErrors ? '⚠️ Setup Issue' : inProgress ? '⏳ Setting up...' : '✓ Ready'}
              </span>
              <span className="font-medium text-primary">
                {completedSteps} / {totalSteps}
              </span>
            </div>
            
            <Progress value={progressPercentage} className="h-3" />
            
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">
                {currentStepMessage}
              </p>
              {inProgress && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">This may take a few moments...</span>
                </div>
              )}
            </div>

            {/* Show detailed errors if any */}
            {hasErrors && (
              <div className="mt-4 space-y-2 p-3 bg-destructive/10 rounded-lg">
                {steps
                  .filter(step => step.status === 'error')
                  .map(step => (
                    <div key={step.id} className="text-sm">
                      <p className="font-medium text-destructive">
                        {step.name} failed
                      </p>
                      {step.errorMessage && (
                        <p className="text-muted-foreground mt-1">{step.errorMessage}</p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Error Alert */}
          {hasErrors && !inProgress && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Some steps failed during setup. Your payment was successful, but we couldn't complete the account setup. 
                Please retry or contact support if the issue persists.
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {allStepsSuccessful && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Your account has been set up successfully! Redirecting to dashboard...
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          {hasErrors && !inProgress && (
            <div className="flex gap-3">
              <Button 
                onClick={handleRetry} 
                disabled={isRetrying || retryCount >= MAX_RETRIES}
                className="flex-1"
              >
                {isRetrying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Setup {retryCount > 0 && `(${retryCount}/${MAX_RETRIES})`}
                  </>
                )}
              </Button>
              <Button 
                onClick={onCancel} 
                variant="outline"
                disabled={isRetrying}
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Max Retries Warning */}
          {retryCount >= MAX_RETRIES && hasErrors && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Maximum retry attempts reached. Please contact support at support@example.com with error details above.
              </AlertDescription>
            </Alert>
          )}

          {/* Info Notice */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              💳 Your payment method has been saved successfully. 
              {hasErrors && ' You can retry the setup without re-entering payment details.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
