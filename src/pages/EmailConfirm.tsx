import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const EmailConfirm = () => {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        console.log('EmailConfirm component loaded');
        console.log('Current URL:', window.location.href);
        console.log('Hash:', window.location.hash);
        
        // Check if this is a callback with tokens in hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        // Check for errors first
        const error = hashParams.get('error');
        const errorCode = hashParams.get('error_code');
        const errorDescription = hashParams.get('error_description');
        
        if (error || errorCode) {
          console.log('Error detected in URL:', { error, errorCode, errorDescription });
          
          // Provide user-friendly error messages
          if (error === 'verification_failed' || errorDescription?.includes('expired') || 
              errorDescription?.includes('Invalid') || errorDescription?.includes('not found')) {
            throw new Error(errorDescription || 'This confirmation link is no longer valid or has already been used.');
          }
          
          if (errorCode === 'otp_expired') {
            throw new Error('The confirmation link has expired. Please request a new confirmation email.');
          }
          
          throw new Error(errorDescription || error || errorCode || 'Verification failed');
        }
        
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        console.log('Email confirmation params:', { 
          accessToken: !!accessToken, 
          refreshToken: !!refreshToken, 
          type,
          fullHash: window.location.hash 
        });

        if (accessToken && refreshToken) {
          console.log('Setting session with tokens from auth-callback...');
          
          // Set the session using the tokens from our auth-callback edge function
          // These tokens were created server-side and work in any browser
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) {
            console.error('Error setting session:', sessionError);
            throw sessionError;
          }

          if (data.user) {
            console.log('✅ Email confirmed successfully for user:', data.user.id);
            console.log('User email confirmed at:', data.user.email_confirmed_at);
            setIsVerified(true);
            toast.success('Email confirmed successfully!');
          } else {
            throw new Error('No user data returned after setting session');
          }
        } else {
          // No tokens in URL - check if user is already signed in
          console.log('No tokens found in URL, checking for existing session...');
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session?.user) {
            if (sessionData.session.user.email_confirmed_at) {
              console.log('User is already authenticated and confirmed');
              setIsVerified(true);
              toast.success('You are already signed in!');
            } else {
              throw new Error('Your email is not yet confirmed. Please check your email and click the confirmation link.');
            }
          } else {
            throw new Error('No authentication tokens found. Please use the confirmation link from your email.');
          }
        }
      } catch (err: any) {
        console.error('Email confirmation error:', err);
        setError(err.message || 'Failed to confirm email');
        toast.error('Failed to confirm email: ' + (err.message || 'Unknown error'));
      } finally {
        setIsVerifying(false);
      }
    };

    handleEmailConfirmation();
  }, [navigate]);

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              Confirming your email...
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              Please wait while we verify your email address.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-green-600">
              <Check className="h-6 w-6" />
              Email Confirmed!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Your email has been successfully confirmed! You can now access your account from any device or browser.
            </p>
            <Button onClick={() => navigate('/signup', { replace: true })} className="w-full">
              Continue to Complete Setup
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              💡 Your account is now verified and can be accessed from any browser or device
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-red-600">
            <AlertCircle className="h-6 w-6" />
            Email Confirmation Failed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          {(error?.includes('already been used') || error?.includes('no longer valid') || error?.includes('already') || error?.includes('expired')) && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-800">
                <strong>Link Already Used?</strong><br />
                If you've already confirmed your email, you can sign in directly. Confirmation links can only be used once for security.
              </AlertDescription>
            </Alert>
          )}
          
          <p className="text-muted-foreground text-center">
            Common reasons for this error:
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>Confirmation link has expired</li>
            <li>Link has already been used</li>
            <li>You may already have a confirmed account</li>
          </ul>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate('/login', { replace: true })} className="w-full">
              Sign In to Your Account
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/signup', { replace: true })} 
              className="w-full"
            >
              Create New Account
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => navigate('/forgot-password', { replace: true })} 
              className="w-full text-sm"
            >
              Forgot Password?
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailConfirm;