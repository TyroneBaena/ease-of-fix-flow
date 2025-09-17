import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface SecurityMetricsCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon: LucideIcon;
  variant?: 'default' | 'warning' | 'danger';
}

export const SecurityMetricsCard: React.FC<SecurityMetricsCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  variant = 'default'
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return 'border-amber-200 bg-amber-50';
      case 'danger':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const getIconStyles = () => {
    switch (variant) {
      case 'warning':
        return 'text-amber-600 bg-amber-100';
      case 'danger':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  };

  return (
    <Card className={`${getVariantStyles()} transition-all hover:shadow-md`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${getIconStyles()}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};