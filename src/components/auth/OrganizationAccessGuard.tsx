import React, { useEffect, useState } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { useMultiOrganizationContext } from '@/contexts/MultiOrganizationContext';
import { Loader2, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface OrganizationAccessGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component to ensure users have proper organization access before rendering children
 * This is an additional safety layer for organization-specific content
 */
export const OrganizationAccessGuard: React.FC<OrganizationAccessGuardProps> = ({ 
  children, 
  fallback 
}) => {
  const { currentUser } = useUserContext();
  const { currentOrganization, loading: orgLoading } = useMultiOrganizationContext();
  const [isValidating, setIsValidating] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const validateAccess = async () => {
      if (!currentUser || orgLoading) {
        return;
      }

      try {
        console.log('🛡️ OrganizationAccessGuard: Validating access for user:', currentUser.email);
        
        // Check if user profile has organization_id
        if (!currentUser.organization_id) {
          console.log('🛡️ User missing organization_id in profile');
          setHasAccess(false);
          setIsValidating(false);
          return;
        }

        // Check if current organization matches user's organization
        if (!currentOrganization) {
          console.log('🛡️ No current organization set');
          setHasAccess(false);
          setIsValidating(false);
          return;
        }

        if (currentUser.organization_id !== currentOrganization.id) {
          console.log('🛡️ Organization mismatch:', {
            userOrg: currentUser.organization_id,
            currentOrg: currentOrganization.id
          });
          setHasAccess(false);
          setIsValidating(false);
          return;
        }

        console.log('🛡️ Organization access validated successfully');
        setHasAccess(true);
      } catch (error) {
        console.error('🛡️ Error validating organization access:', error);
        setHasAccess(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateAccess();
  }, [currentUser, currentOrganization, orgLoading]);

  if (isValidating || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-md bg-red-500 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-xl font-bold">Access Denied</CardTitle>
            <p className="text-sm text-muted-foreground">
              You don't have access to this organization's content.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-center text-gray-600">
              Please contact your administrator or switch to a different organization.
            </p>
            <Button 
              className="w-full"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};