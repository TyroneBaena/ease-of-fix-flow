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
  Zap
} from 'lucide-react';
import { usePropertyAccessControl } from '@/hooks/usePropertyAccessControl';
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
  const navigate = useNavigate();

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
            <Button 
              onClick={() => navigate('/billing')}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reactivate Subscription
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
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
              <Button 
                onClick={() => navigate('/pricing')}
                className="flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                Upgrade Now
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')}
              >
                Back to Dashboard
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
          onClick={() => navigate('/billing')}
          className="flex items-center gap-2 mx-auto"
        >
          <CreditCard className="h-4 w-4" />
          Manage Subscription
        </Button>
      </CardContent>
    </Card>
  );
};