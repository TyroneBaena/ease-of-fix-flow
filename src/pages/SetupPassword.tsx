import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { validatePassword } from "@/utils/passwordValidation";
import logo from "@/assets/logo-light-bg.png";

const FORCE_CHANGE_KEY = 'force_password_change';

const SetupPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [noSession, setNoSession] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const navigate = useNavigate();

  // Check session and get user email on mount
  useEffect(() => {
    const initializeState = async () => {
      const isForcePasswordChange = sessionStorage.getItem(FORCE_CHANGE_KEY) === 'true';
      
      // Check current session
      const { data: sessionData } = await supabase.auth.getSession();
      
      console.log("🔍 SetupPassword state check:", {
        hasSession: !!sessionData?.session,
        userEmail: sessionData?.session?.user?.email,
        isForcePasswordChange
      });
      
      // If we have a session, use the email
      if (sessionData?.session?.user?.email) {
        setEmail(sessionData.session.user.email);
      } else if (!isForcePasswordChange) {
        // No session and not force change = shouldn't be here
        console.warn("⚠️ No session and not force change - redirecting to login");
        setNoSession(true);
      }
    };
    
    initializeState();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate fields
    const newErrors: typeof errors = {};

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
      
      // Verify we have a valid session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("❌ Session check error:", sessionError);
      }
      
      if (!sessionData?.session) {
        console.error("❌ No session - redirecting to login");
        toast.error("Your session has expired. Please log in again with your temporary password.");
        sessionStorage.removeItem(FORCE_CHANGE_KEY);
        navigate(`/login${email ? `?email=${encodeURIComponent(email)}` : ''}`);
        return;
      }
      
      console.log("✅ Session verified for:", sessionData.session.user.email);

      // Update the password
      const { error: updateError, data: updateData } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (updateError) {
        console.error("❌ Password update error:", updateError);
        
        if (updateError.message.includes("not logged in")) {
          toast.error("Session expired. Please log in again with your temporary password.");
          sessionStorage.removeItem(FORCE_CHANGE_KEY);
          navigate('/login');
        } else {
          toast.error(`Failed to update password: ${updateError.message}`);
        }
        return;
      }
      
      if (!updateData?.user) {
        console.error("❌ Password update returned no user data");
        toast.error("Password update may have failed. Please try again.");
        return;
      }
      
      console.log("✅ Password updated successfully for:", updateData.user.email);

      // Get user profile to determine redirect
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

      // Clean up and redirect
      console.log("🔐 Password setup complete - clearing force change flag");
      sessionStorage.removeItem(FORCE_CHANGE_KEY);

      setSuccess(true);
      toast.success("Password updated successfully! Redirecting...");
      
      setTimeout(() => navigate(redirectPath), 2000);
      
    } catch (error: any) {
      console.error("Password setup error:", error);
      toast.error(`Failed to set password: ${error?.message || 'Unknown error'}`);
    } finally {
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
          <p className="text-sm text-gray-500 text-center">Create a new password for your account</p>
        </CardHeader>
        <CardContent>
          {success ? (
            <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              <AlertDescription>Your password has been set successfully! Redirecting to dashboard...</AlertDescription>
            </Alert>
          ) : noSession ? (
            <Alert className="mb-4 bg-red-50 text-red-800 border-red-200">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>
                No active session found. Please{" "}
                <Link to="/login" className="underline font-medium">
                  log in
                </Link>{" "}
                with your temporary password first.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="mb-4 bg-blue-50 text-blue-800 border-blue-200">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>Please create a strong password that you'll remember.</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {email && (
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            )}

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
                disabled={success || noSession}
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
                disabled={success || noSession}
              />
              {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || success || noSession}
            >
              {isLoading ? "Setting Password..." : "Set Password"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm text-primary hover:underline">
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupPassword;
