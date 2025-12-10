import React from 'react';
import { Link } from 'react-router-dom';
import { Property } from '@/types/property';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Mail, Calendar, DollarSign } from 'lucide-react';
import { formatFullDate } from '@/utils/dateFormatUtils';

interface PropertyListItemProps {
  property: Property;
  isAdmin: boolean;
}

export const PropertyListItem: React.FC<PropertyListItemProps> = ({ property, isAdmin }) => {
  return (
    <Link to={`/properties/${property.id}`} className="block">
      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 items-center min-w-0">
          <div className="font-medium truncate">{property.name}</div>
          <div className="text-sm text-muted-foreground truncate hidden md:flex items-center">
            <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">{property.address}</span>
          </div>
          <div className="text-sm text-muted-foreground truncate hidden lg:flex items-center">
            <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">{property.contactNumber}</span>
          </div>
          <div className="text-sm text-muted-foreground truncate hidden lg:flex items-center">
            <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">{property.email}</span>
          </div>
          <div className="text-sm text-muted-foreground truncate hidden lg:flex items-center">
            <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">{formatFullDate(property.renewalDate)}</span>
          </div>
          {isAdmin && (
            <div className="text-sm text-muted-foreground truncate hidden lg:flex items-center">
              <DollarSign className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate">{property.rentAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" className="ml-2 flex-shrink-0">
          View
        </Button>
      </div>
    </Link>
  );
};
