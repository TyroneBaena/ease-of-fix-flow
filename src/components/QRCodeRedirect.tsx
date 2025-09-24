import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * QRCodeRedirect component handles QR code scans by redirecting users to login
 * with the property context preserved for post-authentication redirection
 */
const QRCodeRedirect = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) {
      console.error('❌ QRCodeRedirect - No property ID provided');
      navigate('/login');
      return;
    }

    console.log('🔄 QRCodeRedirect - Property ID from QR code:', id);
    
    // Redirect to login with property context for post-auth redirection
    const redirectPath = `/private/property-requests/${id}`;
    const loginUrl = `/login?redirectTo=${encodeURIComponent(redirectPath)}&propertyId=${id}`;
    
    console.log('🔄 QRCodeRedirect - Redirecting to login with context:', loginUrl);
    navigate(loginUrl, { replace: true });
  }, [id, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Accessing Property</h2>
          <p className="text-muted-foreground">Please sign in to view maintenance requests</p>
        </div>
      </div>
    </div>
  );
};

export default QRCodeRedirect;