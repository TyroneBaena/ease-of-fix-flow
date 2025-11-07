import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Info, Loader2 } from "lucide-react";
import { signInWithEmailPassword } from "@/hooks/auth/authOperations";
import { useSimpleAuth } from "@/contexts/UnifiedAuthContext";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-light-bg.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, loading: authLoading } = useSimpleAuth();

  // Check for invitation code and message from redirect
  useEffect(() => {
    const state = location.state as any;
    if (state?.message) {
      setInfoMessage(state.message);
    }
  }, [location.state]);

  // Helper function to log security events via edge function
  const logSecurityEvent = async (eventType: string, userEmail: string, metadata?: any) => {
    try {
      const { data, error } = await supabase.functions.invoke("log-security-event", {
        body: {
          event_type: eventType,
          user_email: userEmail,
          ip_address: null, // Will be captured server-side
          user_agent: navigator.userAgent,
          metadata: metadata || {},
        },
      });

      if (error) {
        console.error("❌ [Login] FAILED to log security event:", error);
        console.error("❌ [Login] Full error details:", JSON.stringify(error, null, 2));
      } else {
        console.log("🔐 [Login] SUCCESS: Logged security event:", eventType, "for:", userEmail);
        console.log("🔐 [Login] Full response:", JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.error("❌ [Login] EXCEPTION while logging security event:", error);
      console.error("❌ [Login] Exception stack:", error.stack);
    }
  };

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

      console.log("🚀 [Login] About to call signInWithEmailPassword...");
      const { user, error } = await signInWithEmailPassword(email, password);
      console.log("🚀 [Login] signInWithEmailPassword returned:", {
        hasUser: !!user,
        hasError: !!error,
        errorMessage: error?.message,
      });

      if (error) {
        console.error("🚀 Login - Sign in error:", error);

        // CRITICAL: Reset loading state FIRST before any async operations
        setIsLoading(false);

        // Set error message
        if (error.message?.includes("Invalid login credentials")) {
          setError("Invalid email or password. Please check your credentials and try again.");
        } else if (error.message?.includes("Email not confirmed")) {
          setError("Please check your email and click the confirmation link before signing in.");
        } else {
          setError(error.message || "Login failed");
        }

        // Log failed login attempt (async, but doesn't block UI)
        console.log("🔐 [Login] About to log FAILED login attempt for:", email);
        logSecurityEvent("login_failed", email, {
          reason: error.message,
          timestamp: new Date().toISOString(),
          browser: navigator.userAgent.split(" ").pop(),
        })
          .then(() => {
            console.log("🔐 [Login] Finished logging FAILED login attempt");
          })
          .catch((err) => {
            console.error("🔐 [Login] Error logging failed login:", err);
          });

        return;
      }

      if (user) {
        console.log("✅ Login - Sign in successful, redirecting immediately...");

        // Clear any password reset flags on successful login
        sessionStorage.removeItem('password_reset_pending');
        sessionStorage.removeItem('password_reset_email');

        // CRITICAL: Navigate IMMEDIATELY without waiting for logging
        const state = location.state as any;
        const invitationCode = state?.invitationCode;
        const urlParams = new URLSearchParams(location.search);
        const redirectTo = urlParams.get("redirectTo");
        const propertyId = urlParams.get("propertyId");

        let redirectPath;
        if (invitationCode) {
          redirectPath = "/signup";
          console.log(`🚀 Login - Redirecting to: ${redirectPath}`);
          navigate(redirectPath, {
            replace: true,
            state: { invitationCode, returnFromLogin: true },
          });
        } else if (redirectTo && propertyId) {
          redirectPath = `${redirectTo}?propertyId=${propertyId}`;
          console.log(`🚀 Login - Redirecting to: ${redirectPath}`);
          navigate(redirectPath, { replace: true });
        } else if (redirectTo) {
          redirectPath = redirectTo;
          console.log(`🚀 Login - Redirecting to: ${redirectPath}`);
          navigate(redirectPath, { replace: true });
        } else {
          redirectPath = "/dashboard";
          console.log(`🚀 Login - Redirecting to: ${redirectPath}`);
          navigate(redirectPath, { replace: true });
        }
        
        // Log security event AFTER navigation (fire and forget)
        logSecurityEvent("login_success", email, {
          timestamp: new Date().toISOString(),
          browser: navigator.userAgent.split(" ").pop(),
          action: "user_login",
          redirect_to: redirectTo,
          property_id: propertyId,
          from_qr_code: !!(redirectTo && propertyId),
        }).catch(err => console.error("Failed to log security event:", err));
      } else {
        setError("Login failed - no user returned");
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("🚀 Login - Unexpected login error:", error);

      // CRITICAL: Reset loading state FIRST
      setIsLoading(false);
      setError(error.message || "An unexpected error occurred. Please try again.");

      // Log unexpected login error (async, but doesn't block UI)
      console.log("🔐 [Login] About to log UNEXPECTED ERROR for:", email);
      logSecurityEvent("login_failed", email, {
        reason: "unexpected_error",
        error_message: error.message,
        timestamp: new Date().toISOString(),
      })
        .then(() => {
          console.log("🔐 [Login] Finished logging UNEXPECTED ERROR");
        })
        .catch((err) => {
          console.error("🔐 [Login] Error logging unexpected error:", err);
        });
    }
  };

  // CRITICAL: Only show loading spinner during initial auth check, not after login
  // If we're loading from a login attempt, don't unmount - let redirect happen
  if (authLoading || (currentUser && !isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="HousingHub Logo" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <p className="text-sm text-gray-500">Sign in to your HousingHub account</p>
        </CardHeader>
        <CardContent>
          {infoMessage && (
            <Alert className="mb-4 bg-blue-50 text-blue-800 border-blue-200">
              <Info className="h-4 w-4" />
              <AlertDescription>{infoMessage}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="mb-4 bg-red-50 text-red-800 border-red-200">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email *
              </label>
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
              <label htmlFor="password" className="text-sm font-medium">
                Password *
              </label>
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
              <Link to="/forgot-password" className="text-blue-500 hover:underline">
                Forgot password?
              </Link>
            </div>

            <p className="text-sm text-center text-gray-500 mt-4">
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
