import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building, Plus, TrendingUp, AlertCircle } from 'lucide-react';
import { useSubscription } from '@/contexts/subscription/SubscriptionContext';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import { cn } from '@/lib/utils';

interface PropertyCountDisplayProps {
  className?: string;
  showAddButton?: boolean;
  showTrend?: boolean;
  onAddProperty?: () => void;
}

export const PropertyCountDisplay: React.FC<PropertyCountDisplayProps> = ({
  className,
  showAddButton = true,
  showTrend = false,
  onAddProperty
}) => {
  const { propertyCount, monthlyAmount, currency, loading: subscriptionLoading } = useSubscription();
  const { properties, loading: propertiesLoading } = usePropertyContext();

  const loading = subscriptionLoading || propertiesLoading;
  const actualPropertyCount = properties?.length || 0;
  const billingPropertyCount = propertyCount || 0;

  // Check if there's a discrepancy between actual and billing count
  const hasDiscrepancy = actualPropertyCount !== billingPropertyCount;

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-4 bg-muted rounded w-32"></div>
          <div className="h-3 bg-muted rounded w-48"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-12 bg-muted rounded w-24"></div>
            <div className="h-3 bg-muted rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const calculateCostPerProperty = () => {
    if (!billingPropertyCount || billingPropertyCount === 0) return 0;
    return Math.round((monthlyAmount || 0) / billingPropertyCount);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Properties
            </CardTitle>
            <CardDescription>
              Active properties in your portfolio
            </CardDescription>
          </div>
          {showTrend && billingPropertyCount > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {calculateCostPerProperty()}/month each
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Property Count Display */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-3xl font-bold">{actualPropertyCount}</span>
            <span className="text-sm text-muted-foreground">
              {actualPropertyCount === 1 ? 'Property' : 'Properties'}
            </span>
          </div>
          
          {showAddButton && onAddProperty && (
            <Button 
              onClick={onAddProperty}
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Property
            </Button>
          )}
        </div>

        {/* Billing Information */}
        {billingPropertyCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Monthly cost</span>
              <span className="font-medium">
                {currency?.toUpperCase()} ${monthlyAmount?.toFixed(2) || '0.00'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Cost per property</span>
              <span>{currency?.toUpperCase()} ${calculateCostPerProperty()}.00</span>
            </div>
          </div>
        )}

        {/* Discrepancy Warning */}
        {hasDiscrepancy && (
          <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm">
              <p className="text-orange-800 dark:text-orange-200 font-medium">
                Billing sync required
              </p>
              <p className="text-orange-600 dark:text-orange-300 text-xs mt-1">
                You have {actualPropertyCount} properties, but billing shows {billingPropertyCount}. 
                This will be automatically synced on your next billing cycle.
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {actualPropertyCount === 0 && (
          <div className="text-center py-4">
            <Building className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              No properties added yet
            </p>
            {showAddButton && onAddProperty && (
              <Button 
                onClick={onAddProperty}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Your First Property
              </Button>
            )}
          </div>
        )}

        {/* Property Benefits */}
        {actualPropertyCount > 0 && (
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <p>• Each property gets full maintenance management</p>
            <p>• Unlimited maintenance requests per property</p>
            <p>• Advanced reporting and analytics included</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};