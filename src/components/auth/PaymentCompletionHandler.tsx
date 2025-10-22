import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  orgName: string;
  paymentCompleted: boolean;
  onCancel: () => void;
}

export const PaymentCompletionHandler: React.FC<PaymentCompletionHandlerProps> = ({
  user,
  orgName,
  paymentCompleted,
  onCancel
}) => {
  const [steps, setSteps] = useState<SetupStep[]>([
    { id: 'payment', name: 'Payment Method Setup', status: 'success' }, // Already completed
    { id: 'organization', name: 'Create Organization', status: 'pending' },
    { id: 'profile', name: 'Update User Profile', status: 'pending' },
    { id: 'membership', name: 'Create Membership Record', status: 'pending' },
    { id: 'subscriber', name: 'Activate Free Trial', status: 'pending' }
  ]);
  
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

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

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const generateUniqueSlug = async (baseName: string): Promise<string> => {
    const baseSlug = generateSlug(baseName);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const { data: existing, error } = await supabase
        .from('organizations')
        .select('slug')
        .eq('slug', slug)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!existing) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;

      if (counter > 100) {
        slug = `${baseSlug}-${Date.now()}`;
        break;
      }
    }

    return slug;
  };

  const performSetup = async () => {
    console.log('🚀 Starting post-payment setup...');

    try {
      // Step 1: Create Organization (if not already created)
      if (!organizationId) {
        updateStepStatus('organization', 'in-progress');
        
        try {
          const finalSlug = await generateUniqueSlug(orgName.trim());
          
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .insert({
              name: orgName.trim(),
              slug: finalSlug,
              created_by: user.id,
              settings: {}
            })
            .select()
            .single();

          if (orgError) {
            console.error('❌ Organization creation failed:', orgError);
            updateStepStatus('organization', 'error', orgError.message);
            return;
          }

          console.log('✅ Organization created:', orgData);
          setOrganizationId(orgData.id);
          updateStepStatus('organization', 'success');

          // Continue with remaining steps using the new organization ID
          await continueSetup(orgData.id);
        } catch (error: any) {
          console.error('❌ Organization creation exception:', error);
          updateStepStatus('organization', 'error', error.message);
          return;
        }
      } else {
        // Organization already exists, continue with remaining steps
        await continueSetup(organizationId);
      }
    } catch (error: any) {
      console.error('❌ Setup error:', error);
      toast.error('Setup failed. Please try again.');
    }
  };

  const continueSetup = async (orgId: string) => {
    // Step 2: Update User Profile
    updateStepStatus('profile', 'in-progress');
    
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          organization_id: orgId,
          session_organization_id: orgId,
          role: 'admin'
        })
        .eq('id', user.id);

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

    // Step 3: Create User Organization Membership
    updateStepStatus('membership', 'in-progress');
    
    try {
      const { error: membershipError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: user.id,
          organization_id: orgId,
          role: 'admin',
          is_active: true,
          is_default: true
        });

      if (membershipError) {
        console.error('❌ Membership creation failed:', membershipError);
        updateStepStatus('membership', 'error', membershipError.message);
        // Don't return - this is not critical, continue to trial setup
      } else {
        console.log('✅ Membership created');
        updateStepStatus('membership', 'success');
      }
    } catch (error: any) {
      console.error('❌ Membership creation exception:', error);
      updateStepStatus('membership', 'error', error.message);
      // Continue anyway
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
    setIsRetrying(true);
    
    // Reset failed steps to pending
    setSteps(prev => prev.map(step => 
      step.status === 'error' ? { ...step, status: 'pending', errorMessage: undefined } : step
    ));

    await performSetup();
    setIsRetrying(false);
  };

  const allStepsSuccessful = steps.every(step => step.status === 'success');
  const hasErrors = steps.some(step => step.status === 'error');
  const inProgress = steps.some(step => step.status === 'in-progress');

  const getStatusIcon = (status: SetupStep['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'in-progress':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {setupComplete ? 'Setup Complete!' : 'Setting Up Your Account'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Steps */}
          <div className="space-y-4">
            {steps.map((step) => (
              <div key={step.id} className="flex items-start gap-3">
                {getStatusIcon(step.status)}
                <div className="flex-1">
                  <p className={`font-medium ${
                    step.status === 'error' ? 'text-red-600' : 
                    step.status === 'success' ? 'text-green-600' : 
                    'text-gray-700'
                  }`}>
                    {step.name}
                  </p>
                  {step.errorMessage && (
                    <p className="text-sm text-red-600 mt-1">{step.errorMessage}</p>
                  )}
                </div>
              </div>
            ))}
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
                disabled={isRetrying}
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
                    Retry Setup
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
