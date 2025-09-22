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

  // Function to check user organization status
  const checkUserOrganization = async (user: any) => {
    if (!user) return false;
    
    try {
      console.log('🔍 Checking organization for user:', user.email);
      
      // First check if user has any active organization memberships
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('user_organizations')
        .select('organization_id, is_active, is_default')
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      console.log('🔍 User organizations:', userOrgs, 'Error:', userOrgsError);
      
      if (userOrgsError) {
        console.error('Error fetching user organizations:', userOrgsError);
        return false;
      }
      
      // If user has active organizations, they don't need onboarding
      if (userOrgs && userOrgs.length > 0) {
        console.log('🔍 User has', userOrgs.length, 'active organizations - no onboarding needed');
        return true;
      }
      
      console.log('🔍 User has no active organizations - needs onboarding');
      return false;
    } catch (error) {
      console.error('Error checking user organization:', error);
      return false;
    }
  };

// Initialize auth state
useEffect(() => {

  const initializeAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      console.log('Initial session found:', session.user.email, 'confirmed:', !!session.user.email_confirmed_at);
      setCurrentUser(session.user);
      setIsAuthed(true);
      
      if (session.user.email_confirmed_at) {
        const hasOrg = await checkUserOrganization(session.user);
        setHasOrganization(hasOrg);
        setEmailConfirmationRequired(false);
        setInfo(null);
      } else {
        setHasOrganization(false);
        setEmailConfirmationRequired(true);
        setInfo("Please check your email and click the confirmation link to complete your registration.");
      }
    }
  };

  initializeAuth();

  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log(`Auth state changed: ${event}`, session?.user?.email);
    
    if (event === 'SIGNED_IN' && session?.user) {
      console.log('User signed in:', session.user.email, 'confirmed:', !!session.user.email_confirmed_at);
      setCurrentUser(session.user);
      setIsAuthed(true);
      
      if (session.user.email_confirmed_at) {
        const hasOrg = await checkUserOrganization(session.user);
        setHasOrganization(hasOrg);
        setEmailConfirmationRequired(false);
        setInfo(null);
      } else {
        setHasOrganization(false);
        setEmailConfirmationRequired(true);
        setInfo("Please check your email and click the confirmation link to complete your registration.");
      }
    } else if (event === 'SIGNED_OUT') {
      console.log('User signed out');
      setIsAuthed(false);
      setHasOrganization(false);
      setCurrentUser(null);
      setEmailConfirmationRequired(false);
      setInfo(null);
    }
  });

  return () => subscription.unsubscribe();
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
      
      const redirectUrl = `${window.location.origin}/email-confirm`;
      console.log(`Email confirmation redirect URL: ${redirectUrl}`);
      
      // Sign up with proper email confirmation
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name,
            role: 'admin', // First user should be admin by default
            assignedProperties: []
          }
        }
      });
      
      console.log('Signup response:', { data, error: signUpError });
      
      if (signUpError) {
        // Check if this is a "user already exists" error
        if (signUpError.message?.toLowerCase().includes('already registered') || 
            signUpError.message?.toLowerCase().includes('already exists') ||
            signUpError.message?.toLowerCase().includes('user with this email already exists')) {
          setError("An account with this email already exists. Please sign in instead.");
          toast.error("Account already exists. Please sign in instead.");
          // Optionally redirect to login after a delay
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 2000);
          return;
        }
        throw signUpError;
      }
      
      // Check if this is a repeated signup (user already exists but no error thrown)
      if (data.user && data.user.email_confirmed_at && !data.session) {
        console.log("User already exists and is confirmed:", data.user.email);
        setError("An account with this email already exists. Please sign in instead.");
        toast.error("Account already exists. Please sign in instead.");
        // Redirect to login after a delay
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
        return;
      }
      
      if (data.user) {
        console.log("Account created successfully:", data.user.id, "confirmed:", !!data.user.email_confirmed_at);
        
        // Check if this is a new user (session exists) or existing user
        if (data.session) {
          toast.success("Account created successfully!");
        } else if (data.user.email_confirmed_at) {
          // User exists and is already confirmed
          setError("An account with this email already exists. Please sign in instead.");
          toast.error("Account already exists. Please sign in instead.");
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 2000);
          return;
        } else {
          // New user but needs email confirmation
          toast.success("Account created! Please check your email for confirmation.");
        }
        
        // The auth state change listener will handle setting the correct state
        // No need to manually set state here as onAuthStateChange will be triggered
      } else {
        console.log("Signup completed but no user returned - this may indicate email confirmation is required");
        setInfo("Account created successfully. Please check your email for confirmation.");
        toast.info("Account created! Please check your email for confirmation.");
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
    console.log('🚀 Signup - Organization setup completed - redirecting to dashboard');
    
    toast.success("Organization setup complete! Redirecting to dashboard...");
    
    // Shorter delay for better UX
    setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 500);
  };

return (
  <div className="flex items-center justify-center min-h-screen bg-gray-100">
    <Toaster position="top-right" richColors />
    
    {!isAuthed ? (
      // Show signup form when user is not authenticated
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
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="John Doe" 
                required 
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="name@example.com" 
                required 
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Create a password (min 6 characters)" 
                required 
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</label>
              <Input 
                id="confirmPassword" 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="Confirm your password" 
                required 
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Sign Up"}
            </Button>

            <p className="text-sm text-center text-gray-500 mt-4">
              Already have an account? <Link to="/login" className="text-blue-500 hover:underline">Sign in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    ) : isAuthed && !hasOrganization && !emailConfirmationRequired ? (
      // Show organization onboarding when user is authenticated but has no organization
      <OrganizationOnboarding 
        user={currentUser} 
        onComplete={handleOrganizationComplete} 
      />
    ) : emailConfirmationRequired ? (
      // Show email confirmation message
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Check Your Email</CardTitle>
          <p className="text-sm text-gray-500 mt-2">
            Please check your email and click the confirmation link to complete your registration.
          </p>
        </CardHeader>
      </Card>
    ) : (
      // User is authenticated and has organization - redirect will happen via handleOrganizationComplete
      <div className="text-center">
        <p className="text-lg">Setting up your account...</p>
      </div>
    )}
  </div>
);
};

export default Signup;