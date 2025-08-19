
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Check } from 'lucide-react';
import { tenantService } from '@/services/user/tenantService';
import { Toaster } from "sonner";

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Auth and billing step state
  const [isAuthed, setIsAuthed] = useState(false);
  type Interval = 'month' | 'year';
  type Plan = 'starter' | 'pro';
  const [interval, setInterval] = useState<Interval>('month');
  const [selectedPlan, setSelectedPlan] = useState<Plan>('starter');
  const [loadingPlan, setLoadingPlan] = useState(false);

// Initialize auth state and show billing step for authenticated users
useEffect(() => {
  let unsub: { unsubscribe: () => void } | null = null;

  supabase.auth.getSession().then(({ data }) => {
    setIsAuthed(!!data.session);
  });

  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    setIsAuthed(!!session);
  });
  unsub = listener?.subscription ?? null;

  return () => {
    unsub?.unsubscribe?.();
  };
}, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
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
      console.log(`Signing up with email: ${email}`);
      
      // Sign up the user
const { data, error: signUpError } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/email-confirm`,
    data: {
      name,
      role: 'manager', // Default role
      assignedProperties: []
    }
  }
});
      
      if (signUpError) {
        throw signUpError;
      }
      
if (data.user) {
  console.log("Account created successfully:", data.user.id);
  toast.success("Account created! If email confirmation is required, please confirm to continue.");
  
  // Verify schema creation
  setTimeout(async () => {
    try {
      const hasSchema = await tenantService.verifyUserSchema(data.user!.id);
      if (!hasSchema) {
        console.log("Schema not found for user, creating manually");
        const { error: rpcError } = await supabase.rpc('create_tenant_schema', { new_user_id: data.user!.id });
        if (rpcError) {
          console.error("Error creating schema:", rpcError);
        } else {
          console.log("Schema created successfully");
        }
      } else {
        console.log("Schema was created successfully");
      }
    } catch (err) {
      console.error("Error verifying schema:", err);
    }
  }, 1000);

  // If session is already established, proceed to billing step
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session) {
    setIsAuthed(true);
  }
} else {
  // If user signed up but needs to confirm email
  toast.info("Please check your email to confirm your account");
}
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message || "An error occurred during signup");
      toast.error(`Signup failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
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

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Sign Up"}
            </Button>

            <p className="text-sm text-center text-gray-500 mt-4">
              Already have an account? <Link to="/login" className="text-blue-500 hover:underline">Sign in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
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
