import React from 'react';
import { AlertTriangle, Building2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { useMultiOrganizationContext } from '@/contexts/MultiOrganizationContext';

interface OrganizationAccessErrorProps {
  message?: string;
  onRetry?: () => void;
  showSwitcher?: boolean;
}

export const OrganizationAccessError: React.FC<OrganizationAccessErrorProps> = ({
  message = "You don't have access to view this content in the current organization.",
  onRetry,
  showSwitcher = true
}) => {
  const navigate = useNavigate();
  const { userOrganizations, switchOrganization, currentOrganization } = useMultiOrganizationContext();

  const handleOrganizationSwitch = async (orgId: string) => {
    try {
      await switchOrganization(orgId);
      if (onRetry) {
        onRetry();
      }
    } catch (error) {
      console.error('Error switching organization:', error);
    }
  };

  const availableOrganizations = userOrganizations.filter(
    uo => uo.organization_id !== currentOrganization?.id
  );

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">Access Restricted</AlertTitle>
          <AlertDescription className="text-orange-700">
            {message}
          </AlertDescription>
        </Alert>

        {showSwitcher && availableOrganizations.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You may have access in a different organization:
            </p>
            <div className="space-y-2">
              {availableOrganizations.map((userOrg) => (
                <Button
                  key={userOrg.organization_id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleOrganizationSwitch(userOrg.organization_id)}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  <div className="flex flex-col items-start">
                    <span>{userOrg.organization.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {userOrg.role}
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col space-y-2">
          {onRetry && (
            <Button onClick={onRetry} variant="default">
              Try Again
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};