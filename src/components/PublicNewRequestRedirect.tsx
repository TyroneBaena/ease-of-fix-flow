import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * PublicNewRequestRedirect component handles public new request links by redirecting users to login
 * with the new request context preserved for post-authentication redirection
 */
const PublicNewRequestRedirect = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('propertyId');

  useEffect(() => {
    console.log('🔄 PublicNewRequestRedirect - Property ID from URL:', propertyId);
    
    // Create redirect path for new request with property context
    let redirectPath = '/new-request';
    if (propertyId) {
      redirectPath += `?propertyId=${propertyId}`;
    }
    
    const loginUrl = `/login?redirectTo=${encodeURIComponent(redirectPath)}${propertyId ? `&propertyId=${propertyId}` : ''}`;
    
    console.log('🔄 PublicNewRequestRedirect - Redirecting to login with context:', loginUrl);
    navigate(loginUrl, { replace: true });
  }, [navigate, propertyId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Creating New Request</h2>
          <p className="text-muted-foreground">Please sign in to submit a maintenance request</p>
        </div>
      </div>
    </div>
  );
};

export default PublicNewRequestRedirect;