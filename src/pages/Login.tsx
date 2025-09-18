import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Info } from 'lucide-react';
import { signInWithEmailPassword } from '@/hooks/auth/authOperations';
import { useSimpleAuth } from '@/contexts/UnifiedAuthContext';
import { getRedirectPathByRole } from '@/services/userService';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useSimpleAuth();

  // Helper function to log security events
  const logSecurityEvent = async (eventType: string, userEmail: string, metadata?: any) => {
    try {
      await supabase.rpc('log_security_event', {
        p_event_type: eventType,
        p_user_id: null,
        p_user_email: userEmail,
        p_ip_address: null,
        p_user_agent: navigator.userAgent,
        p_session_id: null,
        p_metadata: metadata || {}
      });
      console.log('🔐 Logged security event:', eventType, 'for:', userEmail);
    } catch (error) {
      console.error('❌ Failed to log security event:', error);
    }
  };

  // Redirect if already authenticated with improved logic
  useEffect(() => {
    if (!authLoading && currentUser) {
      const redirectPath = getRedirectPathByRole(currentUser.role);
      console.log(`🚀 Login - User already authenticated (${currentUser.email}), redirecting to: ${redirectPath}`);
      navigate(redirectPath, { replace: true });
    }
  }, [currentUser, authLoading, navigate]);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (authLoading) {
        console.warn('🚀 Login - Auth loading timeout, forcing completion');
        setError('Authentication timeout. Please try refreshing the page.');
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }
    
    try {
      setIsLoading(true);
      console.log(`🚀 Login - Attempting login for: ${email}`);
      
      const { user, error } = await signInWithEmailPassword(email, password);
      
      if (error) {
        console.error('🚀 Login - Sign in error:', error);
        
        // Log failed login attempt
        await logSecurityEvent('login_failed', email, {
          reason: error.message,
          timestamp: new Date().toISOString(),
          browser: navigator.userAgent.split(' ').pop()
        });
        
        if (error.message?.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else if (error.message?.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link before signing in.');
        } else {
          setError(error.message || 'Login failed');
        }
        return;
      }
      
      if (user) {
        console.log('🚀 Login - Sign in successful, waiting for auth context to handle redirection');
        // Note: Successful login events are logged automatically by the useSecurityAnalytics hook
        // The useEffect above will handle redirection once currentUser is set
      } else {
        setError('Login failed - no user returned');
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('🚀 Login - Unexpected login error:', error);
      
      // Log unexpected login error
      await logSecurityEvent('login_failed', email, {
        reason: 'unexpected_error',
        error_message: error.message,
        timestamp: new Date().toISOString()
      });
      
      setError(error.message || 'An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-md bg-blue-500 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">H</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <p className="text-sm text-gray-500">Sign in to your HousingHub account</p>
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
                placeholder="Enter your password" 
                required 
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <Link 
                to="/forgot-password" 
                className="text-blue-500 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <p className="text-sm text-center text-gray-500 mt-4">
              Don't have an account? <Link to="/signup" className="text-blue-500 hover:underline">Sign up</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;