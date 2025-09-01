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
        
        // Check if this is a Supabase auth callback with tokens in hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
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
          // This is a proper Supabase auth callback
          if (type !== 'signup' && type !== 'recovery') {
            throw new Error('Invalid confirmation type. Expected "signup" but got: ' + type);
          }

          console.log('Setting session with tokens...');
          // Set the session using the tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            console.error('Error setting session:', error);
            throw error;
          }

          if (data.user) {
            console.log('Email confirmed successfully for user:', data.user.id);
            console.log('User email confirmed at:', data.user.email_confirmed_at);
            setIsVerified(true);
            toast.success('Email confirmed successfully!');
            
            // Redirect to signup for plan selection - the auth state will be properly set
            setTimeout(() => {
              console.log('Redirecting to signup for plan selection...');
              navigate('/signup', { replace: true });
            }, 2000);
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
              setTimeout(() => {
                navigate('/signup', { replace: true });
              }, 2000);
            } else {
              throw new Error('Your email is not yet confirmed. Please check your email and click the confirmation link.');
            }
          } else {
            throw new Error('No authentication tokens found. Please use the confirmation link from your email or sign up again.');
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
              Your email has been successfully confirmed. You're being redirected to complete your signup.
            </p>
            <Button onClick={() => navigate('/signup', { replace: true })} className="w-full">
              Continue to Plan Selection
            </Button>
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
          <p className="text-muted-foreground text-center">
            There was an issue confirming your email. This might be due to:
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>An expired confirmation link</li>
            <li>An invalid or malformed URL</li>
            <li>The confirmation link was already used</li>
          </ul>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate('/signup', { replace: true })} className="w-full">
              Try Signing Up Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/login', { replace: true })} 
              className="w-full"
            >
              Go to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailConfirm;