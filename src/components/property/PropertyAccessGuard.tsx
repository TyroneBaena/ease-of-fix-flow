import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Lock, 
  Clock, 
  AlertTriangle, 
  CreditCard, 
  RefreshCw,
  Eye
} from 'lucide-react';
import { usePropertyAccessControl } from '@/hooks/usePropertyAccessControl';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { useNavigate } from 'react-router-dom';

interface PropertyAccessGuardProps {
  children: React.ReactNode;
  action?: 'create' | 'update' | 'delete' | 'view';
  fallbackMessage?: string;
}

export const PropertyAccessGuard: React.FC<PropertyAccessGuardProps> = ({
  children,
  action = 'view',
  fallbackMessage
}) => {
  const {
    canCreateProperty,
    canDeleteProperty,
    canUpdateProperty,
    showTrialExpiredWarning,
    showCancelledWarning,
    showReactivationPrompt,
    getAccessMessage
  } = usePropertyAccessControl();
  const { currentUser } = useUnifiedAuth();
  const navigate = useNavigate();

  const isAdmin = currentUser?.role === 'admin';

  // Check if user has access for the specific action
  const hasAccess = () => {
    switch (action) {
      case 'create':
        return canCreateProperty;
      case 'update':
        return canUpdateProperty;
      case 'delete':
        return canDeleteProperty;
      case 'view':
      default:
        return canCreateProperty || canUpdateProperty; // Allow view if any access
    }
  };

  // If user has access, render children normally
  if (hasAccess()) {
    return <>{children}</>;
  }

  // Render appropriate access restriction UI
  if (showReactivationPrompt) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <RefreshCw className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle>Subscription Cancelled</CardTitle>
          <CardDescription>
            Your subscription has been cancelled. Reactivate to continue managing your properties.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {getAccessMessage()}
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-3 justify-center">
            {isAdmin && (
              <Button 
                onClick={() => navigate('/billing-security')}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reactivate Subscription
              </Button>
            )}
            <Button 
              variant={isAdmin ? "outline" : "default"}
              onClick={() => navigate('/billing-security')}
            >
              {isAdmin ? 'Back to Dashboard' : 'View Billing Details'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showTrialExpiredWarning) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle>Trial Expired</CardTitle>
          <CardDescription>
            Your free trial has ended. Upgrade to continue managing your properties.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {getAccessMessage()}
            </AlertDescription>
          </Alert>
          
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Upgrade now to continue with full property management access
            </p>
            
            <div className="flex gap-3 justify-center">
            {isAdmin && (
              <Button 
                  onClick={() => navigate('/billing-security')}
                  className="flex items-center gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  Go to Billing
                </Button>
            )}
              <Button 
                variant={isAdmin ? "outline" : "default"}
                onClick={() => navigate(isAdmin ? '/dashboard' : '/billing-security')}
              >
                {isAdmin ? 'Back to Dashboard' : 'View Billing Details'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generic access denied fallback
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Lock className="h-6 w-6 text-gray-600" />
        </div>
        <CardTitle>Access Restricted</CardTitle>
        <CardDescription>
          {fallbackMessage || getAccessMessage()}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button 
          onClick={() => navigate('/billing-security')}
          className="flex items-center gap-2 mx-auto"
        >
          <Eye className="h-4 w-4" />
          {isAdmin ? 'Manage Subscription' : 'View Billing Details'}
        </Button>
      </CardContent>
    </Card>
  );
};