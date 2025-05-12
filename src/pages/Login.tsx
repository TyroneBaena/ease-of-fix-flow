
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { toast } from '@/lib/toast';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/user';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Toaster } from "sonner";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTempPasswordNote, setShowTempPasswordNote] = useState(false);
  const { signIn, currentUser } = useSupabaseAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Effect to check if user is already logged in and redirect
  useEffect(() => {
    if (currentUser) {
      console.log("User is already logged in, redirecting to dashboard");
      navigate('/dashboard', { replace: true });
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
      
      // Check if this is a first-time login (using temporary password)
      const params = new URLSearchParams(location.search);
      if (params.get('setupPassword') === 'true') {
        // Note: toast is already shown in signInWithEmailPassword
        navigate(`/setup-password?email=${encodeURIComponent(email)}`);
        return;
      }
      
      // Navigate to dashboard - toast is already shown in signInWithEmailPassword
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      // Don't add another toast here since signInWithEmailPassword already shows one
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setIsLoading(true);
      const demoEmail = "demo-user@example.com";
      const demoPassword = "password123";
      
      console.log("Attempting demo login...");
      
      // First try to sign in directly - if the user already exists
      try {
        // Try to sign in first
        await signIn(demoEmail, demoPassword);
        
        // If signed in successfully, update the user's role to admin
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          // Update the user's metadata to set role as admin
          await supabase.auth.updateUser({
            data: {
              name: 'Demo Admin',
              role: 'admin' as UserRole,
              assignedProperties: []
            }
          });
          console.log("Updated user role to admin");
          // Don't show toast here as signIn already shows one
          navigate('/dashboard', { replace: true });
          return;
        }
        
        navigate('/dashboard', { replace: true });
        return;
      } catch (signInError) {
        console.log("Demo user doesn't exist yet, creating...");
      }
      
      // If sign-in failed, create the demo user with admin role
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: demoEmail,
        password: demoPassword,
        options: {
          data: {
            name: 'Demo Admin',
            role: 'admin' as UserRole,
            assignedProperties: []
          }
        }
      });
      
      if (signUpError) {
        console.error("Error creating demo user:", signUpError);
        toast.error("Failed to create demo account: " + signUpError.message);
        return;
      }
      
      // Now sign in with the newly created account
      await signIn(demoEmail, demoPassword);
      // Don't show a toast here as signIn will show one
      navigate('/dashboard');
    } catch (error) {
      console.error('Demo login error:', error);
      // Don't add a duplicate toast here
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Toaster position="bottom-right" richColors />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-md bg-blue-500 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">M</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Sign in to MaintenanceHub</CardTitle>
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
                <a href="/forgot-password" className="text-sm text-blue-500 hover:underline">
                  Forgot password?
                </a>
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
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>
            
            <Button 
              type="button" 
              variant="outline" 
              className="w-full" 
              onClick={handleDemoLogin}
              disabled={isLoading}
            >
              Demo Login (No Password Required)
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
