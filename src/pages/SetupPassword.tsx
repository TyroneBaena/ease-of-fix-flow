
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { tenantService } from '@/services/user/tenantService';

const SetupPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [hasSession, setHasSession] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [verifyingSchema, setVerifyingSchema] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Get email from URL query parameter
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
    
    // Check for reset token in URL hash
    const hasResetToken = location.hash && location.hash.includes('access_token');
    setIsResetMode(hasResetToken);
    
    // Check if there's an active session
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session);
      
      // If there's a session but navigated here via password reset
      if (data.session && hasResetToken) {
        console.log("Found session with reset token, ready to set new password");
      }
    };
    
    checkSession();
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Email is missing. Please use the link from your invitation or reset email");
      return;
    }
    
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    try {
      setIsLoading(true);
      console.log(`Setting up new password for email: ${email}, isResetMode: ${isResetMode}`);
      
      if (isResetMode && !hasSession) {
        // For password reset flow when no session exists
        // We need to extract the access token from URL hash
        const hashParams = new URLSearchParams(location.hash.substring(1)); // Remove the leading '#'
        const accessToken = hashParams.get('access_token');
        
        if (!accessToken) {
          toast.error("Password reset link is invalid or has expired");
          return;
        }
        
        // Set the session with the access token
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get('refresh_token') || '',
        });
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          toast.error(`Failed to authenticate: ${sessionError.message}`);
          return;
        }
      }
      
      // Now update the password
      const { error, data } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        // If not logged in, this could be a password reset flow
        if (error.message.includes('not logged in')) {
          toast.error("Please sign in with your temporary password or use the reset link from your email");
          navigate(`/login?email=${encodeURIComponent(email)}`);
          return;
        }
        
        throw error;
      }
      
      // Verify the tenant schema exists for this user
      setVerifyingSchema(true);
      if (data.user) {
        const hasSchema = await tenantService.verifyUserSchema(data.user.id);
        
        if (!hasSchema) {
          console.log("Schema not found for user, attempting to create...");
          try {
            // Attempt to create schema manually
            const { error: rpcError } = await supabase.rpc('create_tenant_schema', {
              new_user_id: data.user.id
            });
            
            if (rpcError) {
              console.error("Error creating schema:", rpcError);
              toast.error("Your account was set up, but there was an issue with your database setup. Please contact support.");
            } else {
              console.log("Schema created successfully");
            }
          } catch (schemaError) {
            console.error("Exception creating schema:", schemaError);
          }
        } else {
          console.log("Schema already exists for this user");
        }
      }
      setVerifyingSchema(false);
      
      // Show success message and set success state
      toast.success("Password set successfully! You will be redirected to dashboard shortly.");
      setSuccess(true);
      
      // Redirect after a short delay to allow the user to see the success message
      setTimeout(() => navigate('/dashboard'), 3000);
    } catch (error) {
      console.error('Password setup error:', error);
      toast.error(`Failed to set password: ${error.message}`);
    } finally {
      setIsLoading(false);
      setVerifyingSchema(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-md bg-blue-500 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">M</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Set Up Your Password</CardTitle>
          <p className="text-sm text-gray-500 text-center">
            Create a new password for your Property Manager account
          </p>
        </CardHeader>
        <CardContent>
          {success ? (
            <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              <AlertDescription>
                Your password has been set successfully! Redirecting to dashboard...
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="mb-4 bg-blue-50 text-blue-800 border-blue-200">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>
                Please create a strong password that you'll remember.
              </AlertDescription>
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
                placeholder="Your email address"
                disabled={!!email}
                required 
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">New Password</label>
              <Input 
                id="password" 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Create a strong password"
                required 
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
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || success || verifyingSchema}
            >
              {isLoading ? "Setting Up..." : verifyingSchema ? "Configuring Account..." : "Set Password & Continue"}
            </Button>
            
            <p className="text-sm text-center text-gray-500 mt-4">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-500 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupPassword;
