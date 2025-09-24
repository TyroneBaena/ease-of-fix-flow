import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

/**
 * QRCodeRedirect component handles QR code scans with automatic token validation
 * and temporary session creation for property access
 */
const QRCodeRedirect = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'validating' | 'success' | 'error'>('validating');
  const [message, setMessage] = useState('Validating access token...');

  useEffect(() => {
    const validateTokenAndCreateSession = async () => {
      if (!token) {
        console.error('❌ QRCodeRedirect - No token provided');
        setStatus('error');
        setMessage('Invalid QR code - no token found');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      try {
        console.log('🔄 QRCodeRedirect - Validating token:', token);
        
        // Call the edge function to validate token and create session
        const { data, error } = await supabase.functions.invoke('validate-qr-token', {
          body: { token }
        });

        if (error || !data.success) {
          console.error('❌ Token validation failed:', error || data.error);
          setStatus('error');
          setMessage(data?.error || 'Invalid or expired QR code');
          toast({
            title: "Access Denied",
            description: data?.error || "Invalid or expired QR code",
            variant: "destructive"
          });
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        console.log('✅ Token validation successful:', data);
        setStatus('success');
        setMessage(`Access granted to ${data.propertyName}`);
        
        // Store temporary session data in localStorage
        localStorage.setItem('temporarySession', JSON.stringify({
          sessionToken: data.sessionToken,
          propertyId: data.propertyId,
          propertyName: data.propertyName,
          organizationId: data.organizationId,
          expiresAt: data.expiresAt
        }));

        toast({
          title: "Access Granted",
          description: `Welcome! You now have access to ${data.propertyName}`,
        });

        // Redirect to the property maintenance requests
        setTimeout(() => {
          navigate(`/property-access/${data.propertyId}`, { replace: true });
        }, 1500);

      } catch (error) {
        console.error('❌ Unexpected error during token validation:', error);
        setStatus('error');
        setMessage('Something went wrong. Please try scanning the QR code again.');
        toast({
          title: "Error",
          description: "Something went wrong. Please try again.",
          variant: "destructive"
        });
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    validateTokenAndCreateSession();
  }, [token, navigate, toast]);

  const getIcon = () => {
    switch (status) {
      case 'validating':
        return <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />;
      case 'success':
        return <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />;
      case 'error':
        return <AlertCircle className="h-12 w-12 text-destructive mx-auto" />;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-md mx-auto p-6">
        {getIcon()}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            {status === 'validating' && 'Validating Access'}
            {status === 'success' && 'Access Granted!'}
            {status === 'error' && 'Access Denied'}
          </h2>
          <p className="text-muted-foreground">{message}</p>
          {status === 'error' && (
            <p className="text-sm text-muted-foreground mt-2">
              Redirecting to login...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRCodeRedirect;