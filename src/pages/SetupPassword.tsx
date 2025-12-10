import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { validatePassword } from "@/utils/passwordValidation";
import logo from "@/assets/logo-light-bg.png";

// Session storage keys for password reset tokens
const TOKEN_STORAGE_KEY = 'password_reset_access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'password_reset_refresh_token';
const RESET_EMAIL_STORAGE_KEY = 'password_reset_email';
const RESET_PENDING_KEY = 'password_reset_pending';
const FORCE_CHANGE_KEY = 'force_password_change';

const SetupPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const navigate = useNavigate();
  const location = useLocation();
  
  // Track if we've already captured tokens to prevent double processing
  const tokensCaptured = useRef(false);

  // CRITICAL: Capture tokens IMMEDIATELY on mount, before Supabase clears the hash
  useEffect(() => {
    if (tokensCaptured.current) return;
    
    const rawHash = window.location.hash;
    console.log("🔐 SetupPassword mount - checking for tokens in URL hash");
    
    if (rawHash && rawHash.includes('access_token')) {
      const hashParams = new URLSearchParams(rawHash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const tokenType = hashParams.get('type');
      
      if (accessToken && refreshToken) {
        console.log("🔐 CAPTURED reset tokens before Supabase processing:", {
          tokenType,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken
        });
        
        // Store tokens in sessionStorage IMMEDIATELY
        sessionStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
        sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
        sessionStorage.setItem(RESET_PENDING_KEY, 'true');
        tokensCaptured.current = true;
      }
    }
    
    // Get email from URL query parameter
    const params = new URLSearchParams(location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setEmail(emailParam);
      sessionStorage.setItem(RESET_EMAIL_STORAGE_KEY, emailParam);
    } else {
      // Try to get from sessionStorage
      const storedEmail = sessionStorage.getItem(RESET_EMAIL_STORAGE_KEY);
      if (storedEmail) {
        setEmail(storedEmail);
      }
    }
  }, [location.search]);

  // Check session state and stored tokens
  useEffect(() => {
    const initializeState = async () => {
      const isForcePasswordChange = sessionStorage.getItem(FORCE_CHANGE_KEY) === 'true';
      const hasStoredTokens = !!sessionStorage.getItem(TOKEN_STORAGE_KEY);
      const isPendingReset = sessionStorage.getItem(RESET_PENDING_KEY) === 'true';
      
      // Check current session
      const { data: sessionData } = await supabase.auth.getSession();
      
      console.log("🔍 SetupPassword state check:", {
        hasSession: !!sessionData?.session,
        userEmail: sessionData?.session?.user?.email,
        hasStoredTokens,
        isPendingReset,
        isForcePasswordChange
      });
      
      // If we have a session and user email, use it
      if (sessionData?.session?.user?.email && !email) {
        setEmail(sessionData.session.user.email);
      }
      
      // Determine if this is an expired/invalid link scenario:
      // No session, no stored tokens, not force password change = expired link
      if (!sessionData?.session && !hasStoredTokens && !isForcePasswordChange) {
        console.warn("⚠️ No session, no stored tokens, not force change - link may be expired");
        // Don't set expired yet - user might not have clicked the link yet
      }
    };
    
    initializeState();
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLinkExpired(false);

    // Validate fields
    const newErrors: typeof errors = {};

    if (!email) {
      newErrors.email = "Email is missing. Please use the link from your invitation or reset email";
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.errors[0];
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsLoading(true);
      
      const isForcePasswordChange = sessionStorage.getItem(FORCE_CHANGE_KEY) === 'true';
      const storedAccessToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
      const storedRefreshToken = sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
      
      console.log("🔐 Password submit - checking session state:", {
        isForcePasswordChange,
        hasStoredTokens: !!storedAccessToken
      });

      // Step 1: Check for existing session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("❌ Session check error:", sessionError);
      }
      
      console.log("🔐 Current session state:", {
        hasSession: !!sessionData?.session,
        sessionEmail: sessionData?.session?.user?.email
      });

      // Step 2: If no session, try to restore from stored tokens
      if (!sessionData?.session) {
        if (storedAccessToken && storedRefreshToken) {
          console.log("🔐 No active session - restoring from stored tokens");
          
          const { error: restoreError } = await supabase.auth.setSession({
            access_token: storedAccessToken,
            refresh_token: storedRefreshToken
          });
          
          if (restoreError) {
            console.error("❌ Failed to restore session from stored tokens:", restoreError);
            // Clear invalid tokens
            sessionStorage.removeItem(TOKEN_STORAGE_KEY);
            sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
            sessionStorage.removeItem(RESET_PENDING_KEY);
            
            setLinkExpired(true);
            toast.error("Your password reset link has expired. Please request a new one.");
            setIsLoading(false);
            return;
          }
          
          console.log("✅ Session restored from stored tokens");
        } else if (isForcePasswordChange) {
          // Force password change but no session - redirect to login
          console.error("❌ Force password change but no session - redirecting to login");
          toast.error("Your session has expired. Please log in again with your temporary password.");
          sessionStorage.removeItem(FORCE_CHANGE_KEY);
          navigate(`/login?email=${encodeURIComponent(email)}`);
          setIsLoading(false);
          return;
        } else {
          // No session, no stored tokens, not force change = expired link
          console.error("❌ No session and no stored tokens - link expired");
          setLinkExpired(true);
          toast.error("Password reset link has expired. Please request a new reset link.");
          setIsLoading(false);
          return;
        }
      }

      // Step 3: Verify we now have a valid session
      const { data: verifySession } = await supabase.auth.getSession();
      
      if (!verifySession?.session) {
        console.error("❌ Session verification failed after restore attempt");
        setLinkExpired(true);
        toast.error("Failed to establish session. Please request a new password reset link.");
        setIsLoading(false);
        return;
      }
      
      console.log("✅ Session verified for:", verifySession.session.user.email);

      // Step 4: Update the password
      const { error: updateError, data: updateData } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (updateError) {
        console.error("❌ Password update error:", updateError);
        
        if (updateError.message.includes("not logged in")) {
          toast.error("Session expired. Please request a new password reset link.");
          setLinkExpired(true);
        } else {
          toast.error(`Failed to update password: ${updateError.message}`);
        }
        setIsLoading(false);
        return;
      }
      
      if (!updateData?.user) {
        console.error("❌ Password update returned no user data");
        toast.error("Password update may have failed. Please try again.");
        setIsLoading(false);
        return;
      }
      
      console.log("✅ Password updated successfully for:", updateData.user.email);

      // Step 5: Get user profile to determine redirect
      let redirectPath = "/dashboard";
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, organization_id')
          .eq('id', updateData.user.id)
          .maybeSingle();
        
        if (profile?.role === 'contractor') {
          redirectPath = "/contractor-dashboard";
        }
        
        // Clear must_change_password flag
        await supabase
          .from('profiles')
          .update({ must_change_password: false })
          .eq('id', updateData.user.id);
          
      } catch (profileError) {
        console.warn("Profile fetch/update error (non-blocking):", profileError);
      }

      // Step 6: Clean up and redirect
      console.log("🔐 Password setup complete - clearing all reset flags");
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(RESET_EMAIL_STORAGE_KEY);
      sessionStorage.removeItem(RESET_PENDING_KEY);
      sessionStorage.removeItem(FORCE_CHANGE_KEY);

      setSuccess(true);
      toast.success("Password updated successfully! Redirecting...");
      
      setTimeout(() => navigate(redirectPath), 2000);
      
    } catch (error: any) {
      console.error("Password setup error:", error);
      toast.error(`Failed to set password: ${error?.message || 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="HousingHub Logo" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Set Up Your Password</CardTitle>
          <p className="text-sm text-gray-500 text-center">Create a new password for your Property Manager account</p>
        </CardHeader>
        <CardContent>
          {success ? (
            <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              <AlertDescription>Your password has been set successfully! Redirecting to dashboard...</AlertDescription>
            </Alert>
          ) : linkExpired ? (
            <Alert className="mb-4 bg-red-50 text-red-800 border-red-200">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>
                Your password reset link has expired or is invalid.{" "}
                <Link to="/forgot-password" className="underline font-medium">
                  Request a new reset link
                </Link>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="mb-4 bg-blue-50 text-blue-800 border-blue-200">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>Please create a strong password that you'll remember.</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email*
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                placeholder="Your email address"
                disabled={!!email}
                required
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                New Password*
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: undefined });
                }}
                placeholder="Enter new password"
                required
                disabled={success || linkExpired}
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              <p className="text-xs text-gray-500">
                Password must be at least 8 characters with uppercase, lowercase, and special character
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password*
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                }}
                placeholder="Confirm your password"
                required
                disabled={success || linkExpired}
              />
              {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || success || linkExpired}
            >
              {isLoading ? "Setting Password..." : "Set Password"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm text-primary hover:underline">
              Already have a password? Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupPassword;
