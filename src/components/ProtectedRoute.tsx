
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
    loading, 
    currentOrganization: !!currentOrganization,
    orgLoading
  });
  
  // Check organization access
  useEffect(() => {
    const checkAccess = async () => {
      if (loading || orgLoading) {
        return; // Still loading auth or organization data
      }

      if (!currentUser) {
        console.log("🔒 ProtectedRoute: No user found, redirecting to login");
        navigate('/login', { replace: true });
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
  if (loading || orgLoading || isCheckingAccess) {
    console.log('🔒 ProtectedRoute - Showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }
  
  // If no user and not loading, redirect immediately
  if (!currentUser) {
    console.log("🔒 ProtectedRoute: No user found, showing Navigate component");
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
