import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, 
  Plus, 
  AlertTriangle, 
  Lock,
  Zap
} from 'lucide-react';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import { usePropertyAccessControl } from '@/hooks/usePropertyAccessControl';
import { PropertyBillingAlert } from '@/components/billing/PropertyBillingAlert';
import { useNavigate } from 'react-router-dom';

export const PropertyManagementWidget: React.FC = () => {
  const { properties, loading } = usePropertyContext();
  const { 
    canCreateProperty, 
    showTrialExpiredWarning, 
    showCancelledWarning,
    getAccessMessage,
    handleRestrictedAction 
  } = usePropertyAccessControl();
  const navigate = useNavigate();

  const handleAddProperty = () => {
    if (!canCreateProperty) {
      handleRestrictedAction('create property');
      return;
    }
    navigate('/properties');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Properties
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Billing alert for trial/cancelled users */}
      <PropertyBillingAlert />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Properties ({properties.length})
          </CardTitle>
          <CardDescription>
            Manage your property portfolio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Access restrictions alert */}
          {(showTrialExpiredWarning || showCancelledWarning) && (
            <Alert>
              {showCancelledWarning ? (
                <Lock className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription>
                {getAccessMessage()}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Property count and actions */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {properties.length === 0 
                ? "No properties added yet" 
                : `${properties.length} propert${properties.length !== 1 ? 'ies' : 'y'} managed`
              }
            </div>
            
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => navigate('/properties')}
              >
                View All
              </Button>
              
              {canCreateProperty ? (
                <Button 
                  size="sm" 
                  onClick={handleAddProperty}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Property
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  onClick={handleAddProperty}
                  className="flex items-center gap-1"
                  disabled={showTrialExpiredWarning || showCancelledWarning}
                >
                  {showTrialExpiredWarning && <Zap className="h-3 w-3" />}
                  {showCancelledWarning && <Lock className="h-3 w-3" />}
                  {showTrialExpiredWarning ? 'Upgrade to Add' : 'Reactivate to Add'}
                </Button>
              )}
            </div>
          </div>
          
          {/* Recent properties preview */}
          {properties.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Recent Properties
              </div>
              <div className="space-y-1">
                {properties.slice(0, 3).map((property) => (
                  <div 
                    key={property.id}
                    className="flex items-center justify-between p-2 rounded border text-sm hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/properties/${property.id}`)}
                  >
                    <span className="font-medium">{property.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {property.address.length > 30 
                        ? `${property.address.substring(0, 30)}...` 
                        : property.address
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};