import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { toast } from '@/lib/toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Toaster } from "sonner";
import { ensureUserOrganization } from '@/services/user/tenantService';
import { getRedirectPathByRole } from '@/services/userService';
import { supabase } from '@/integrations/supabase/client';
import { OrganizationOnboarding } from '@/components/auth/OrganizationOnboarding';
import '@/auth-debug'; // Force import to ensure debug logs appear


const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTempPasswordNote, setShowTempPasswordNote] = useState(false);
  const [needsOrganization, setNeedsOrganization] = useState(false);
  const { currentUser, currentOrganization } = useUnifiedAuth();
  
  const navigate = useNavigate();
  const location = useLocation();

  // Function to check if user needs organization setup
  const checkUserOrganization = async (user: any) => {
    if (!user?.id) return false;
    
    try {
      console.log('🔍 Checking organization for user:', user.id);
      
      // First check if user has any active organization membership
      const { data: userOrgs, error: userOrgError } = await supabase
        .from('user_organizations')
        .select('organization_id, is_active, is_default')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);
      
      if (userOrgError) {
        console.error('Error checking user organizations:', userOrgError);
        return false;
      }
      
      console.log('🔍 User organizations found:', userOrgs);
      
      if (userOrgs && userOrgs.length > 0) {
        console.log('✅ User has active organization:', userOrgs[0].organization_id);
        return true;
      }
      
      // Fallback: check profile table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('Error checking user profile:', profileError);
        return false;
      }
      
      const hasOrg = !!profile?.organization_id;
      console.log('🔍 Profile organization_id:', profile?.organization_id, 'hasOrg:', hasOrg);
      return hasOrg;
    } catch (error) {
      console.error('Error checking user organization:', error);
      return false;
    }
  };

  // Effect to check if user is already logged in and redirect
  useEffect(() => {
    console.log("🔑 Login v9.0: useEffect triggered - currentUser:", !!currentUser, currentUser?.email, "on path:", location.pathname);
    
    if (currentUser && location.pathname === '/login') {
      console.log("🔑 Login v9.0: User is already logged in on login page, checking organization status");
      
      // Check if user needs organization setup
      checkUserOrganization(currentUser).then(hasOrg => {
        console.log("🔑 Login v9.0: User has organization:", hasOrg);
        
        if (!hasOrg) {
          console.log("🔑 Login v9.0: User needs organization setup");
          setNeedsOrganization(true);
        } else {
          console.log("🔑 Login v9.0: User has organization, redirecting to dashboard");
          const redirectPath = getRedirectPathByRole(currentUser.role);
          console.log("🔑 Login v9.0: Redirecting to:", redirectPath);
          navigate(redirectPath, { replace: true });
        }
      });
    } else if (currentUser) {
      console.log("🔑 Login v9.0: User is logged in but not on login page, no redirect needed");
    } else {
      console.log("🔑 Login v9.0: No current user found");
      setNeedsOrganization(false);
    }
  }, [currentUser, navigate, location.pathname]);

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
      console.log(`🔑 Login v7.0: Attempting to sign in with email: ${email}`);
      
      // Direct sign in without clearing session first
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('🔑 Login v7.0: Auth error:', error);
        toast.error(error.message || 'Failed to sign in');
        setIsLoading(false);
        return;
      }
      
      console.log('🔑 Login v7.0: Auth successful, user:', data.user?.email);
      console.log('🔑 Login v7.0: Session:', !!data.session);
      console.log('🔑 Login v7.0: Full auth data:', data);
      
      // Check if user needs organization setup
      const hasOrg = await checkUserOrganization(data.user);
      console.log('🔑 Login v9.0: User has organization after login:', hasOrg);
      
      if (!hasOrg) {
        console.log('🔑 Login v9.0: User needs organization setup after login');
        setNeedsOrganization(true);
        setIsLoading(false);
      } else {
        console.log('🔑 Login v9.0: User has organization, waiting for auth state update');
        // Wait a moment for the auth state listener to fire
        setTimeout(() => {
          console.log('🔑 Login v9.0: Auth state should have been updated by now');
          setIsLoading(false);
        }, 2000);
      }
      
    } catch (error: any) {
      console.error('🔑 Login v7.0: Login error:', error);
      toast.error(error.message || 'Failed to sign in');
      setIsLoading(false);
    }
  };

  const handleOrganizationComplete = async () => {
    console.log('🔑 Login v9.0: Organization setup completed - redirecting to dashboard');
    
    // Simply redirect to dashboard - the context refresh will be handled by ProtectedRoute
    toast.success("Organization setup complete! Redirecting to dashboard...");
    setNeedsOrganization(false);
    
    setTimeout(() => {
      if (currentUser) {
        const redirectPath = getRedirectPathByRole(currentUser.role);
        navigate(redirectPath, { replace: true });
      }
    }, 1000);
  };

  // Show organization onboarding if user needs it
  if (currentUser && needsOrganization) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Toaster position="top-right" richColors />
        <OrganizationOnboarding 
          user={currentUser} 
          onComplete={handleOrganizationComplete} 
        />
      </div>
    );
  }

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