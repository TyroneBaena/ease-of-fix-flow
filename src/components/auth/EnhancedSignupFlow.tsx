import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Building, Shield, Check, Loader2 } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { STRIPE_CONFIG } from '@/config/stripe';

// Initialize Stripe using centralized configuration
const stripePromise = loadStripe(STRIPE_CONFIG.publishableKey);

interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
}

const CardSetupForm: React.FC<{
  onSuccess: (setupIntentId: string) => void;
  onError: (error: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  formData: SignupFormData;
}> = ({ onSuccess, onError, isLoading, setIsLoading, formData }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [setupIntentClientSecret, setSetupIntentClientSecret] = useState<string | null>(null);

  const createSetupIntent = async () => {
    try {
      // Validation first
      if (!formData.email || !formData.password || !formData.name) {
        onError('Please fill in all required fields');
        setIsLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        onError('Passwords do not match');
        setIsLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        onError('Password must be at least 6 characters long');
        setIsLoading(false);
        return;
      }

      // First create the user account
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: 'admin',
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (signUpError) {
        onError(signUpError.message);
        setIsLoading(false);
        return;
      }

      if (data.user && !data.session) {
        onError('Please check your email and click the confirmation link before proceeding.');
        setIsLoading(false);
        return;
      }

      if (!data.session) {
        onError('Failed to create user session');
        setIsLoading(false);
        return;
      }

      // Now create setup intent and trial subscription
      console.log('Calling create-trial-subscription edge function...');
      const response = await supabase.functions.invoke('create-trial-subscription', {
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      });

      console.log('Edge function response:', response);

      if (response.error) {
        console.error('Edge function error:', response.error);
        // Don't fail here - we'll create the trial manually in the fallback
        console.log('Edge function failed, will create trial manually later');
      }

      if (response.data?.client_secret) {
        console.log('Setup intent created successfully');
        setSetupIntentClientSecret(response.data.client_secret);
      } else {
        console.log('No client secret in response, will create trial manually');
        // Set a placeholder to continue with the flow
        setSetupIntentClientSecret('placeholder-continue-flow');
      }
    } catch (error) {
      console.error('Setup intent creation error:', error);
      onError('Failed to initialize payment setup');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Set loading state immediately when button is clicked
    setIsLoading(true);

    if (!setupIntentClientSecret) {
      // First create the account and setup intent
      await createSetupIntent();
      return;
    }
    if (!stripe || !elements) {
      onError('Payment system not ready');
      setIsLoading(false);
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      onError('Card information is required');
      setIsLoading(false);
      return;
    }

    const { error, setupIntent } = await stripe.confirmCardSetup(setupIntentClientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: formData.name,
          email: formData.email,
        },
      },
    });

    if (error) {
      onError(error.message || 'Payment setup failed');
      setIsLoading(false);
    } else if (setupIntent) {
      onSuccess(setupIntent.id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Credit Card Information</label>
        <div className="border rounded-md p-3 bg-background">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Your card will not be charged during the 30-day trial period.
        </p>
      </div>
      
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {setupIntentClientSecret ? 'Starting Trial...' : 'Creating Account...'}
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Sign Up & Start Trial
          </>
        )}
      </Button>
    </form>
  );
};

export const EnhancedSignupFlow: React.FC = () => {
  const [step, setStep] = useState<'signup' | 'complete'>('signup');
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handlePaymentSuccess = async (setupIntentId: string) => {
    setIsLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const user = session.session?.user;
      
      if (!user) {
        setError('Authentication session expired');
        return;
      }

      // Create organization
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: `${formData.name}'s Organization`,
          created_by: user.id,
          slug: `${formData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        })
        .select()
        .single();

      if (orgError) {
        console.error('Organization creation error:', orgError);
        setError('Failed to create organization');
        return;
      }

      // Update user profile with organization
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email!,
          name: formData.name,
          role: 'admin',
          organization_id: organization.id,
        });

      if (profileError) {
        console.error('Profile update error:', profileError);
        setError('Failed to update user profile');
        return;
      }

      // Create user organization membership
      const { error: membershipError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: user.id,
          organization_id: organization.id,
          role: 'admin',
          is_active: true,
          is_default: true,
        });

      if (membershipError) {
        console.error('Membership creation error:', membershipError);
      }

      // Verify trial subscription was created - if not, create it manually
      const { data: subscriberCheck } = await supabase
        .from('subscribers')
        .select('is_trial_active, trial_start_date')
        .eq('user_id', user.id)
        .single();

      if (!subscriberCheck || !subscriberCheck.is_trial_active) {
        console.log('Trial not found, creating directly in database...');
        
        // Calculate trial end date (30 days from now)
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 30);
        
        // Create subscriber record directly with upsert to handle potential conflicts
        const { data: newSubscriber, error: createError } = await supabase
          .from('subscribers')
          .upsert({
            user_id: user.id,
            email: user.email!,
            is_trial_active: true,
            trial_start_date: new Date().toISOString(),
            trial_end_date: trialEndDate.toISOString(),
            is_cancelled: false,
            active_properties_count: 0,
            subscribed: false,
          }, {
            onConflict: 'user_id'
          })
          .select()
          .single();

        if (createError) {
          console.error('Direct subscriber creation error:', createError);
          setError('Failed to start your trial. Please contact support.');
          return;
        }

        console.log('Trial subscription created/updated directly:', newSubscriber);
      } else {
        console.log('Trial subscription already active:', subscriberCheck);
      }

      setStep('complete');
      toast.success('Welcome! Your 30-day trial has started successfully.');
      
      // Redirect to dashboard after a brief delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Payment success handling error:', error);
      setError('An error occurred while setting up your account');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
    // Scroll to the signup container to show error
    const container = document.getElementById('signup-container');
    if (container) {
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-700">Welcome Aboard!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Your 30-day trial has started successfully. You'll be redirected to your dashboard shortly.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span>Account created</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span>Payment method saved</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span>30-day trial activated</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-lg" id="signup-container">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Create Your Account</CardTitle>
            <div className="flex justify-center">
              <Badge variant="secondary">
                <Building className="w-4 h-4 mr-1" />
                Property Management Made Simple
              </Badge>
            </div>
            <p className="text-center text-muted-foreground mt-2">
              Sign up to start your 30-day free trial
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">Full Name</label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">Password</label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Create a password"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Confirm your password"
                    required
                  />
                </div>
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="font-medium mb-2">Payment Method</h3>
                  <p className="text-sm text-muted-foreground">
                    Add a payment method to start your 30-day free trial
                  </p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">What happens next?</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Your 30-day trial starts immediately</li>
                    <li>• No charges during the trial period</li>
                    <li>• $29/property billing begins after trial</li>
                    <li>• Cancel anytime before trial ends</li>
                  </ul>
                </div>

                <Elements stripe={stripePromise}>
                  <CardSetupForm
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    isLoading={isLoading}
                    setIsLoading={setIsLoading}
                    formData={formData}
                  />
                </Elements>
              </div>

              <div className="text-center text-sm text-muted-foreground mt-4">
                Already have an account?{' '}
                <a href="/login" className="text-primary hover:underline">
                  Sign in
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};