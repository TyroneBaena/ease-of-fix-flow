import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { toast } from '@/lib/toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Toaster } from "sonner";
import { ensureUserOrganization } from '@/services/user/tenantService';
import { getRedirectPathByRole } from '@/services/userService';
import { supabase } from '@/integrations/supabase/client';
import { useMultiOrganizationContext } from '@/contexts/UnifiedAuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTempPasswordNote, setShowTempPasswordNote] = useState(false);
  const { signIn, currentUser } = useSupabaseAuth();
  
  const navigate = useNavigate();
  const location = useLocation();

  // Effect to check if user is already logged in and redirect
  useLayoutEffect(() => {
    if (currentUser) {
      console.log("User is already logged in, redirecting to appropriate dashboard");
      const redirectPath = getRedirectPathByRole(currentUser.role);
      navigate(redirectPath, { replace: true });
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    // Check if we have email and setupPassword in query params
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    const setupPassword = params.get('setupPassword');
    
    if (emailParam) {
      setEmail(emailParam);
      
      if (setupPassword === 'true') {
        setShowTempPasswordNote(true);
      }
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }
    
    try {
      setIsLoading(true);
      console.log(`Attempting to sign in with email: ${email}`);
      const result = await signIn(email, password);
      
      // Check if the user has organization setup
      if (result?.user) {
        console.log("Login successful, verifying organization...");
        
        
        // Verify user has organization setup
        const hasOrganization = await ensureUserOrganization(result.user.id);
        
        if (!hasOrganization) {
          console.log("User missing organization, but continuing login");
          toast.warning("Your account setup may be incomplete. Please contact support if you experience issues.");
        }
        
        // Check if this is a first-time login (using temporary password)
        const params = new URLSearchParams(location.search);
        if (params.get('setupPassword') === 'true') {
          navigate(`/setup-password?email=${encodeURIComponent(email)}`);
          return;
        }
        
        // The auth state listener will handle navigation automatically
        // Don't navigate here - let the useLayoutEffect handle it
        console.log('Login successful, auth state listener will handle navigation');
      }
    } catch (error) {
      console.error('Login error:', error);
      // Don't add another toast here since signInWithEmailPassword already shows one
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Toaster position="top-right" richColors />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-md bg-blue-500 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">H</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Sign in to HousingHub</CardTitle>
          <p className="text-sm text-gray-500">
            Enter your email and password to access your account
          </p>
        </CardHeader>
        <CardContent>
          {showTempPasswordNote && (
            <Alert className="mb-4 bg-blue-50 text-blue-800 border-blue-200">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>
                Please sign in with your temporary password from the invitation email, then you'll be redirected to set up your permanent password.
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <Link to="/forgot-password" className="text-sm text-blue-500 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input 
                id="password" 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
            
            <p className="text-sm text-center text-gray-500">
              Don't have an account?{" "}
              <Link to="/signup" className="text-blue-500 hover:underline">
                Sign up
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;