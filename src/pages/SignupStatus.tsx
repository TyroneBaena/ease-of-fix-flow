import React, { useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react';

const SignupStatus = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const status = searchParams.get('status');
  const email = searchParams.get('email');

  // Redirect to signup if no status is provided
  useEffect(() => {
    if (!status || (status !== 'exists' && status !== 'success')) {
      navigate('/signup', { replace: true });
    }
  }, [status, navigate]);

  if (status === 'exists') {
    // Email already exists
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Email Already Exists</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-gray-600">
                An account with the email <span className="font-semibold">{email}</span> already exists.
              </p>
              <p className="text-gray-600">
                Please sign in to continue or use a different email address.
              </p>
            </div>
            
            <div className="space-y-3 pt-4">
              <Button 
                onClick={() => navigate('/login')} 
                className="w-full"
                size="lg"
              >
                Sign In Instead
              </Button>
              
              <Button 
                onClick={() => navigate('/signup')} 
                variant="outline"
                className="w-full"
                size="lg"
              >
                Try Different Email
              </Button>
            </div>

            <div className="text-center pt-4 border-t">
              <p className="text-sm text-gray-500">
                Forgot your password?{' '}
                <Link to="/forgot-password" className="text-blue-500 hover:underline font-medium">
                  Reset it here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    // Signup successful - check email
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Check Your Email!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <Mail className="h-12 w-12 text-blue-500" />
              </div>
              
              <p className="text-gray-600">
                We've sent a confirmation email to:
              </p>
              <p className="font-semibold text-lg">{email}</p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  Next Steps:
                </p>
                <ol className="text-sm text-blue-700 space-y-1 text-left list-decimal list-inside">
                  <li>Check your email inbox</li>
                  <li>Click the confirmation link</li>
                  <li>Complete your organization setup</li>
                </ol>
              </div>

              <p className="text-sm text-gray-500 pt-2">
                Didn't receive the email? Check your spam folder or wait a few minutes.
              </p>
            </div>

            <div className="text-center pt-4 border-t">
              <Link to="/login" className="text-sm text-blue-500 hover:underline">
                Return to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default SignupStatus;
