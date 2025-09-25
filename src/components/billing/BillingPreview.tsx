import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building, Calculator, Calendar, CreditCard } from 'lucide-react';
import { useSubscription } from '@/contexts/subscription/SubscriptionContext';
import { cn } from '@/lib/utils';

interface BillingPreviewProps {
  className?: string;
  showDetails?: boolean;
}

export const BillingPreview: React.FC<BillingPreviewProps> = ({
  className,
  showDetails = true
}) => {
  const { 
    propertyCount, 
    monthlyAmount, 
    currency,
    isTrialActive,
    trialEndDate,
    subscribed,
    loading
  } = useSubscription();

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-4 bg-muted rounded w-32"></div>
          <div className="h-3 bg-muted rounded w-48"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-8 bg-muted rounded w-24"></div>
            <div className="h-3 bg-muted rounded w-full"></div>
            <div className="h-3 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '$0';
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = () => {
    if (isTrialActive) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Trial Active</Badge>;
    }
    if (subscribed) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Subscribed</Badge>;
    }
    return <Badge variant="outline">Not Subscribed</Badge>;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Billing Preview
            </CardTitle>
            <CardDescription>
              Property-based billing calculation
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Property Count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Properties</span>
          </div>
          <span className="font-medium">{propertyCount || 0}</span>
        </div>

        <Separator />

        {/* Pricing Calculation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Price per property</span>
            <span>{currency?.toUpperCase()} $29.00</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Number of properties</span>
            <span>× {propertyCount || 0}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between font-medium">
            <span>Monthly total</span>
            <span className="text-lg">{currency?.toUpperCase()} {formatCurrency(monthlyAmount)}</span>
          </div>
        </div>

        {showDetails && (
          <>
            <Separator />
            
            {/* Additional Details */}
            <div className="space-y-3 text-sm">
              {isTrialActive && trialEndDate && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Trial ends</span>
                  </div>
                  <span>{formatDate(trialEndDate)}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Billing frequency</span>
                </div>
                <span>Monthly</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Currency</span>
                <span>{currency?.toUpperCase() || 'AUD'}</span>
              </div>
            </div>

            {/* Billing Notes */}
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
              <p>• Billing is calculated monthly based on your active properties</p>
              <p>• Properties added mid-month are prorated</p>
              <p>• Changes take effect on your next billing cycle</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};