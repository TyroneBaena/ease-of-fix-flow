
import React, { ReactNode, useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useUserContext } from '@/contexts/UserContext';
import { useMultiOrganizationContext } from '@/contexts/MultiOrganizationContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { Loader2, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrganizationOnboarding } from '@/components/auth/OrganizationOnboarding';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading } = useUserContext();
  const { currentOrganization, loading: orgLoading, refreshOrganizations } = useMultiOrganizationContext();
  const navigate = useNavigate();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  
  console.log('🔒 ProtectedRoute - State:', { 
    currentUser: !!currentUser, 
    currentUserEmail: currentUser?.email,
    loading, 
    currentOrganization: !!currentOrganization,
    orgLoading,
    isCheckingAccess,
    timestamp: new Date().toISOString()
  });
  
  // Check organization access
  useEffect(() => {
    const checkAccess = async () => {
      // Wait for auth loading to complete first
      if (loading) {
        console.log("🔒 ProtectedRoute: Still loading auth, waiting...");
        return; 
      }

      // If auth is done loading but no user, redirect to login
      if (!currentUser) {
        console.log("🔒 ProtectedRoute: Auth loading complete, no user found, redirecting to login");
        setIsCheckingAccess(false);
        return; // Let the render logic handle the redirect
      }

      // Now wait for organization loading to complete
      if (orgLoading) {
        console.log("🔒 ProtectedRoute: User found, waiting for organization loading...");
        return;
      }

      console.log('🔒 Checking user organization access:', {
        userId: currentUser.id,
        email: currentUser.email,
        hasCurrentOrg: !!currentOrganization,
        orgId: currentUser.organization_id
      });

      // If user has no current organization, they need to go through onboarding
      if (!currentOrganization) {
        console.log("🔒 User has no organization access, showing onboarding");
        setIsCheckingAccess(false);
        return;
      }

      console.log("🔒 User has organization access, allowing access to protected route");
      setIsCheckingAccess(false);
    };

    checkAccess();
  }, [currentUser, loading, currentOrganization, orgLoading, navigate]);
  
  // Show loading state while checking authentication or organization
  if (loading || orgLoading || (isCheckingAccess && currentUser)) {
    console.log('🔒 ProtectedRoute - Showing loading state:', {
      loading,
      orgLoading, 
      isCheckingAccess,
      hasCurrentUser: !!currentUser,
      timestamp: new Date().toISOString()
    });
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }
  
  // Only redirect to login if auth loading is complete and no user found
  if (!loading && !currentUser) {
    console.log("🔒 ProtectedRoute: REDIRECTING TO LOGIN - No user found after auth loading complete", {
      loading,
      currentUser: !!currentUser,
      orgLoading,
      isCheckingAccess,
      timestamp: new Date().toISOString()
    });
    return <Navigate to="/login" replace />;
  }

  // If user doesn't have organization, show organization onboarding
  if (!currentOrganization) {
    console.log("🔒 ProtectedRoute: User missing organization, showing onboarding");
    return (
      <OrganizationOnboarding 
        user={currentUser} 
        onComplete={() => {
          console.log('Organization onboarding completed, refreshing organization data');
          refreshOrganizations();
        }} 
      />
    );
  }
  
  // Only render children if we have a valid authenticated user with organization
  console.log('🔒 ProtectedRoute - Rendering protected content for user:', currentUser.email);
  return (
    <OrganizationProvider>
      {children}
    </OrganizationProvider>
  );
};

export default ProtectedRoute;
