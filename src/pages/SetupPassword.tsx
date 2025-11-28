import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { ensureUserOrganization } from "@/services/user/tenantService";
import { validatePassword } from "@/utils/passwordValidation";
import logo from "@/assets/logo-light-bg.png";

const SetupPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [hasSession, setHasSession] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [verifyingSchema, setVerifyingSchema] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Get email from URL query parameter
    const params = new URLSearchParams(location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }

    // Check for reset token in URL hash
    const hasResetToken = location.hash && location.hash.includes("access_token");
    setIsResetMode(hasResetToken);

    // FALLBACK: If user arrives via password reset link and flag isn't set yet, set it
    // Primary setting is now in UnifiedAuthContext PASSWORD_RECOVERY handler
    if (hasResetToken && !sessionStorage.getItem('password_reset_pending')) {
      console.log("🔐 Password reset link detected (fallback) - setting pending flag");
      sessionStorage.setItem('password_reset_pending', 'true');
      sessionStorage.setItem('password_reset_email', emailParam || '');
    }

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

    // Clear previous errors
    setErrors({});

    // Validate fields
    const newErrors: typeof errors = {};

    if (!email) {
      newErrors.email = "Email is missing. Please use the link from your invitation or reset email";
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.errors[0];
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // If there are validation errors, set them and stop
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsLoading(true);
      console.log(`Setting up new password for email: ${email}, isResetMode: ${isResetMode}`);

      // Handle password reset flow - check for tokens in URL hash
      if (isResetMode) {
        // Extract the access token from URL hash (if not already in session)
        const hashParams = new URLSearchParams(location.hash.substring(1)); // Remove the leading '#'
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken && !hasSession) {
          console.log("Found reset tokens in URL, establishing session");
          // Set the session with the access token
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error("Session error:", sessionError);
            toast.error(`Failed to authenticate: ${sessionError.message}`);
            return;
          }
          
          // Update hasSession state after successful session creation
          setHasSession(true);
        } else if (!hasSession) {
          // No tokens and no session - invalid reset link
          toast.error("Password reset link is invalid or has expired. Please request a new reset link.");
          return;
        }
      }

      // Now update the password (session should be established at this point)
      const { error, data } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        // If not logged in, this could be a password reset flow
        if (error.message.includes("not logged in")) {
          toast.error("Please sign in with your temporary password or use the reset link from your email");
          navigate(`/login?email=${encodeURIComponent(email)}`);
          return;
        }

        throw error;
      }

      // Get user's role and organization to determine redirect
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, organization_id')
        .eq('id', data.user.id)
        .maybeSingle();

      console.log('User profile after password reset:', profile);

      // Check if user has organization membership
      const { data: orgMembership } = await supabase
        .from('user_organizations')
        .select('organization_id, role')
        .eq('user_id', data.user.id)
        .eq('is_active', true)
        .maybeSingle();

      console.log('User organization membership:', orgMembership);

      // Determine redirect based on role and organization
      let redirectPath = "/dashboard";
      
      if (!profile) {
        toast.error("Profile not found. Please contact support.");
        return;
      }

      const userRole = profile.role;
      const hasOrganization = !!orgMembership?.organization_id;

      // For password reset (existing users)
      if (isResetMode) {
        // Check if user has organization
        if (!hasOrganization) {
          // Users without organization after password reset = data issue
          toast.error("Your account is not associated with an organization. Please contact support.");
          setErrors({ email: "Account setup incomplete. Please contact support for assistance." });
          return;
        }

        // Contractors go to contractor dashboard
        if (userRole === 'contractor') {
          redirectPath = "/contractor-dashboard";
          toast.success("Password reset successful! Redirecting to contractor dashboard...");
        } else {
          // Admins and managers go to regular dashboard
          toast.success("Password reset successful! Redirecting to dashboard...");
          redirectPath = "/dashboard";
        }
      }
      // For new user setup (initial password set from invitation)
      else {
        // New users should have been added to organization via invitation
        if (!hasOrganization) {
          toast.error("Organization membership not found. Please use your invitation link.");
          setErrors({ email: "Please use the invitation link sent to your email to complete setup." });
          return;
        }

        // Contractors go to contractor dashboard
        if (userRole === 'contractor') {
          redirectPath = "/contractor-dashboard";
          toast.success("Account setup complete! Redirecting to contractor dashboard...");
        } else {
          // Admins and managers go to regular dashboard
          toast.success("Account setup complete! Redirecting to dashboard...");
          redirectPath = "/dashboard";
        }
      }

      setSuccess(true);

      // CRITICAL: Clear the password reset pending flag - user has completed setup
      console.log("🔐 Password setup complete - clearing reset pending flag");
      sessionStorage.removeItem('password_reset_pending');
      sessionStorage.removeItem('password_reset_email');

      // Redirect after a short delay
      setTimeout(() => navigate(redirectPath), 2000);
    } catch (error) {
      console.error("Password setup error:", error);
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
                placeholder="Create a strong password"
                required
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
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
              />
              {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || success || verifyingSchema}>
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
