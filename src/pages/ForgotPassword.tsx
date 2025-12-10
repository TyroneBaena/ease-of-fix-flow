import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import logo from "@/assets/logo-light-bg.png";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    try {
      setIsSubmitting(true);

      // Call the self-service password reset edge function
      const { data, error } = await supabase.functions.invoke('self-service-password-reset', {
        body: { email }
      });

      if (error) {
        console.error("Password reset error:", error);
        toast.error("Failed to send reset email. Please try again.");
        return;
      }

      if (!data?.success) {
        console.error("Password reset failed:", data?.message);
        toast.error(data?.message || "Failed to send reset email. Please try again.");
        return;
      }

      setEmailSent(true);
      toast.success("Password reset email sent! Check your inbox.");
    } catch (error: any) {
      console.error("Reset password error:", error);
      toast.error("Failed to send reset email: " + (error.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="HousingHub Logo" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Forgot Password</CardTitle>
          <p className="text-sm text-gray-500 text-center">
            {emailSent 
              ? "Check your email for your temporary password"
              : "Enter your email to receive a temporary password"
            }
          </p>
        </CardHeader>
        <CardContent>
          {emailSent ? (
            <>
              <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                <AlertDescription>
                  We've sent a temporary password to <strong>{email}</strong>. 
                  Use it to log in, and you'll be prompted to set a new password.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <Link to="/login" className="block">
                  <Button className="w-full">
                    Go to Login
                  </Button>
                </Link>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setEmailSent(false);
                    setEmail("");
                  }}
                >
                  Send to Different Email
                </Button>
              </div>
            </>
          ) : (
            <>
              <Alert className="mb-4 bg-yellow-50 text-yellow-800 border-yellow-200">
                <AlertCircle className="h-4 w-4 mr-2" />
                <AlertDescription>
                  We'll send you a temporary password. You'll need to set a new password after logging in.
                </AlertDescription>
              </Alert>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email Address *
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send Temporary Password"}
                </Button>

                <p className="text-sm text-center text-gray-500 mt-4">
                  Back to{" "}
                  <Link to="/login" className="text-blue-500 hover:underline">
                    Login
                  </Link>
                </p>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
