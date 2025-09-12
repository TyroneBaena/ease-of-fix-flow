
import React, { ReactNode, useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useUserContext } from '@/contexts/UserContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { Loader2, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading } = useUserContext();
  const navigate = useNavigate();
  const [checkingOrganization, setCheckingOrganization] = useState(true);
  const [hasOrganization, setHasOrganization] = useState(false);
  
  console.log('🔒 ProtectedRoute - State:', { currentUser: !!currentUser, loading, hasOrganization });
  
  // Check if user has organization membership
  useEffect(() => {
    const checkUserOrganization = async () => {
      if (!currentUser) {
        setCheckingOrganization(false);
        return;
      }

      try {
        console.log('🔒 Checking organization for user:', currentUser.id);
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', currentUser.id)
          .single();

        if (error) {
          console.error('🔒 Error checking organization:', error);
          setHasOrganization(false);
        } else {
          const hasOrg = !!profile?.organization_id;
          console.log('🔒 Organization check result:', { hasOrg, orgId: profile?.organization_id });
          setHasOrganization(hasOrg);
        }
      } catch (error) {
        console.error('🔒 Exception checking organization:', error);
        setHasOrganization(false);
      } finally {
        setCheckingOrganization(false);
      }
    };

    if (currentUser && !loading) {
      checkUserOrganization();
    } else if (!currentUser && !loading) {
      setCheckingOrganization(false);
    }
  }, [currentUser, loading]);
  
  // Handle redirect when user is not authenticated (only when loading is complete)
  useEffect(() => {
    if (!loading && !currentUser) {
      console.log("🔒 ProtectedRoute: User not authenticated, redirecting to login");
      navigate('/login', { replace: true });
    }
  }, [loading, currentUser, navigate]);
  
  // Show loading state while checking authentication or organization
  if (loading || checkingOrganization) {
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

  // If user doesn't have organization, show organization setup required
  if (!hasOrganization) {
    console.log("🔒 ProtectedRoute: User missing organization, showing setup required");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-md bg-amber-500 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold">Organization Required</CardTitle>
            <p className="text-sm text-muted-foreground">
              You need to be part of an organization to access this application.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-center text-gray-600">
              Please contact your system administrator or create an organization to continue.
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => navigate('/signup')}
              >
                Setup Organization
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  supabase.auth.signOut();
                  navigate('/login');
                }}
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
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
