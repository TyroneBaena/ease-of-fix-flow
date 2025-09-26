import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Plus, DollarSign, Calculator, Info } from 'lucide-react';
import { useSubscription } from '@/contexts/subscription/SubscriptionContext';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import { usePropertyBillingIntegration } from '@/hooks/usePropertyBillingIntegration';

interface PropertyCreationWithBillingProps {
  onCreateProperty: () => void;
  className?: string;
}

export const PropertyCreationWithBilling: React.FC<PropertyCreationWithBillingProps> = ({
  onCreateProperty,
  className
}) => {
  const { isTrialActive, subscribed, propertyCount, monthlyAmount } = useSubscription();
  const { properties } = usePropertyContext();
  const { billingAmount } = usePropertyBillingIntegration();
  const [showBillingPreview, setShowBillingPreview] = useState(false);

  const currentPropertyCount = properties.length;
  const nextPropertyCount = currentPropertyCount + 1;
  const nextBillingAmount = nextPropertyCount * 29;

  const handleCreateProperty = () => {
    if (isTrialActive || subscribed) {
      setShowBillingPreview(true);
    } else {
      onCreateProperty();
    }
  };

  const confirmCreateProperty = () => {
    setShowBillingPreview(false);
    onCreateProperty();
  };

  if (showBillingPreview) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Billing Impact Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Current Properties</span>
              <Badge variant="outline">{currentPropertyCount}</Badge>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">After Adding Property</span>
              <Badge variant="default">{nextPropertyCount}</Badge>
            </div>
            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {isTrialActive ? 'Post-trial billing' : 'Next billing cycle'}
                </span>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground line-through">
                    ${billingAmount}/month
                  </div>
                  <div className="font-semibold text-green-600">
                    ${nextBillingAmount}/month
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isTrialActive && (
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                Your trial continues unchanged. Billing starts after your trial ends.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button onClick={confirmCreateProperty} className="flex-1">
              <Plus className="w-4 h-4 mr-2" />
              Add Property
            </Button>
            <Button variant="outline" onClick={() => setShowBillingPreview(false)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold mb-2">Add Your First Property</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start managing maintenance requests by adding a property to your portfolio.
            </p>
          </div>

          {(isTrialActive || subscribed) && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Current billing:</span>
                <span className="font-medium">${billingAmount}/month</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span>After adding property:</span>
                <span className="font-medium text-green-600">$29/month</span>
              </div>
            </div>
          )}

          <Button onClick={handleCreateProperty} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};