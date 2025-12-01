
import React from 'react';
import { Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PropertyInfoProps {
  propertyId?: string;
  propertyName?: string;
}

export const PropertyInfo = ({ propertyId, propertyName }: PropertyInfoProps) => {
  if (!propertyId || !propertyName) {
    return (
      <div className="space-y-1">
        <span className="text-sm text-muted-foreground">Property</span>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Not assigned</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <span className="text-sm text-muted-foreground">Property</span>
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        <Link 
          to={`/properties/${propertyId}`}
          className="text-primary hover:text-primary/80 hover:underline font-medium"
        >
          {propertyName}
        </Link>
      </div>
    </div>
  );
};
