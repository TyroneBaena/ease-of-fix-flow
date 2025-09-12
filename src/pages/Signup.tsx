import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Check, Info } from 'lucide-react';
import { ensureUserOrganization } from '@/services/user/tenantService';
import { Toaster } from "sonner";
import { OrganizationOnboarding } from '@/components/auth/OrganizationOnboarding';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const navigate = useNavigate();

  // Auth, organization and billing step state
  const [isAuthed, setIsAuthed] = useState(false);
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);
  const [hasOrganization, setHasOrganization] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  type Interval = 'month' | 'year';
  type Plan = 'starter' | 'pro';
  const [interval, setInterval] = useState<Interval>('month');
  const [selectedPlan, setSelectedPlan] = useState<Plan>('starter');
  const [loadingPlan, setLoadingPlan] = useState(false);

// Initialize auth state - only check for CONFIRMED users
useEffect(() => {
  let unsub: { unsubscribe: () => void } | null = null;

  const checkUserOrganization = async (user: any) => {
    if (!user) return false;
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      return !!profile?.organization_id;
    } catch (error) {
      console.error('Error checking user organization:', error);
      return false;
    }
  };

  supabase.auth.getSession().then(async ({ data }) => {
    // Only set as authenticated if user exists AND email is confirmed
    const isConfirmedUser = data.session?.user && data.session.user.email_confirmed_at;
    
    if (isConfirmedUser) {
      setCurrentUser(data.session.user);
      const hasOrg = await checkUserOrganization(data.session.user);
      setHasOrganization(hasOrg);
      setIsAuthed(true);
    } else if (data.session?.user && !data.session.user.email_confirmed_at) {
      setEmailConfirmationRequired(true);
      setInfo("Please check your email and click the confirmation link to complete your registration.");
    }
  });

  const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log(`Auth state changed: ${event}`, session?.user?.email_confirmed_at);
    
    // Only show organization/plan selection for confirmed users
    if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
      setCurrentUser(session.user);
      const hasOrg = await checkUserOrganization(session.user);
      setHasOrganization(hasOrg);
      setIsAuthed(true);
      setEmailConfirmationRequired(false);
      setInfo(null);
    } else if (event === 'SIGNED_OUT') {
      setIsAuthed(false);
      setHasOrganization(false);
      setCurrentUser(null);
      setEmailConfirmationRequired(false);
      setInfo(null);
    }
  });
  unsub = listener?.subscription ?? null;

  return () => {
    unsub?.unsubscribe?.();
  };
}, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    
    if (!email || !password || !name) {
      setError("All fields are required");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    try {
      setIsLoading(true);
      console.log(`Starting signup process for: ${email}`);
      
      // Clean up any existing auth state first
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log('Could not clear existing session:', err);
      }
      
      const redirectUrl = `${window.location.origin}/email-confirm`;
      console.log(`Email confirmation redirect URL: ${redirectUrl}`);
      
      // Sign up with proper email confirmation - DISABLE Supabase's built-in emails
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Remove emailRedirectTo to prevent Supabase from sending its own email
          data: {
            name,
            role: 'manager',
            assignedProperties: []
          }
        }
      });
      
      console.log('Signup response:', { data, error: signUpError });
      
      if (signUpError) {
        throw signUpError;
      }
      
      if (data.user) {
        console.log("Account created successfully:", data.user.id);
        
        // Check if email confirmation is required
        if (!data.user.email_confirmed_at) {
          console.log("Email confirmation required - sending custom confirmation email");
          
          // Send confirmation email via edge function
          try {
            const { error: emailError } = await supabase.functions.invoke('send-auth-email', {
              body: {
                user: {
                  email: data.user.email,
                  id: data.user.id
                },
                email_data: {
                  token_hash: data.user.id, // Use user ID as token for now
                  token: data.user.id,
                  type: 'signup',
                  redirect_to: `${window.location.origin}/email-confirm`
                }
              }
            });
            
            if (emailError) {
              console.error('Error sending confirmation email:', emailError);
              toast.error('Account created but failed to send confirmation email. Please contact support.');
            } else {
              console.log('Confirmation email sent successfully');
              toast.success("Account created! Please check your email for confirmation.");
            }
          } catch (emailErr) {
            console.error('Exception sending confirmation email:', emailErr);
            toast.error('Account created but failed to send confirmation email. Please contact support.');
          }
          
          setEmailConfirmationRequired(true);
          setInfo("Account created! Please check your email for a confirmation link. After confirming, you'll be able to choose your subscription plan.");
        } else {
          // User is immediately confirmed (email confirmation disabled in Supabase)
          console.log("Email confirmation not required - proceeding to plan selection");
          setIsAuthed(true);
          toast.success("Account created successfully! You can now choose your plan.");
        }
        
        // Don't auto-create organization anymore - user will do it in onboarding
      } else {
        toast.info("Account created successfully. Please check your email for confirmation.");
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message || "An error occurred during signup");
      toast.error(`Signup failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrganizationComplete = async () => {
    console.log('Organization setup completed');
    setHasOrganization(true);
    toast.success("Setup complete! You can now choose your plan.");
  };

return (
  <div className="flex items-center justify-center min-h-screen bg-gray-100">
    <Toaster position="top-right" richColors />
    {!isAuthed ? (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-md bg-blue-500 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">H</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
          <p className="text-sm text-gray-500">Sign up to access HousingHub</p>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 bg-red-50 text-red-800 border-red-200">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {info && (
            <Alert className="mb-4 bg-blue-50 text-blue-800 border-blue-200">
              <Info className="h-4 w-4 mr-2" />
              <AlertDescription>{info}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Full Name</label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password (min 6 characters)" required />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your password" required />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || emailConfirmationRequired}>
              {isLoading ? "Creating Account..." : emailConfirmationRequired ? "Check Your Email" : "Sign Up"}
            </Button>
            
            {emailConfirmationRequired && (
              <div className="text-center text-sm text-gray-600 mt-2">
                <p>Didn't receive the email? Check your spam folder or</p>
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-blue-500"
                  onClick={() => {
                    setEmailConfirmationRequired(false);
                    setInfo(null);
                  }}
                >
                  try signing up again
                </Button>
              </div>
            )}

            <p className="text-sm text-center text-gray-500 mt-4">
              Already have an account? <Link to="/login" className="text-blue-500 hover:underline">Sign in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    ) : !hasOrganization ? (
      <OrganizationOnboarding 
        user={currentUser} 
        onComplete={handleOrganizationComplete} 
      />
    ) : (
      <Card className="w-full max-w-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Choose Your Plan — 30 Days Free</CardTitle>
          <p className="text-sm text-gray-500">You won't be charged until your trial ends.</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className={interval === 'month' ? 'font-semibold' : 'text-muted-foreground'}>Monthly</span>
            <button className="inline-flex h-9 items-center rounded-full bg-muted px-1" onClick={() => setInterval(interval === 'month' ? 'year' : 'month')}>
              <span className={`inline-block h-7 w-24 rounded-full bg-background shadow transition-all ${interval === 'month' ? 'translate-x-0' : 'translate-x-0'}`}></span>
              <span className="sr-only">Toggle billing interval</span>
            </button>
            <span className={interval === 'year' ? 'font-semibold' : 'text-muted-foreground'}>Yearly</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className={`rounded-lg border p-4 ${selectedPlan === 'starter' ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedPlan('starter')}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Starter</h3>
                <div className="text-xl font-bold">{interval === 'month' ? 'A$49' : 'A$490'}</div>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Up to 5 properties</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Core features</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Email support</li>
              </ul>
            </div>
            <div className={`rounded-lg border p-4 ${selectedPlan === 'pro' ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedPlan('pro')}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Pro</h3>
                <div className="text-xl font-bold">{interval === 'month' ? 'A$99' : 'A$990'}</div>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Unlimited properties</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Advanced features</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Priority support</li>
              </ul>
            </div>
          </div>

          <Button className="mt-6 w-full" disabled={loadingPlan} onClick={async () => {
            try {
              setLoadingPlan(true);
              const { data, error } = await supabase.functions.invoke('create-checkout', { body: { plan: selectedPlan, interval } });
              setLoadingPlan(false);
              if (error) {
                console.error(error);
                toast.error(error.message || 'Unable to start checkout.');
                return;
              }
              const url = (data as any)?.url;
              if (url) window.open(url, '_blank');
            } catch (err: any) {
              setLoadingPlan(false);
              console.error(err);
              toast.error(err.message || 'Unable to start checkout.');
            }
          }}>
            {loadingPlan ? 'Starting...' : 'Start 30-Day Free Trial'}
          </Button>

          <p className="mt-2 text-xs text-muted-foreground text-center">Secure payments via Stripe. No charges until day 31.</p>
          <p className="mt-4 text-sm text-center">
            Or <Link to="/dashboard" className="text-blue-500 hover:underline">go to your dashboard</Link>
          </p>
        </CardContent>
      </Card>
    )}
  </div>
);
};

export default Signup;