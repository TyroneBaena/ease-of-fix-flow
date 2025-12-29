
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Mail, User, Calendar, DollarSign, Home } from 'lucide-react';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { isUserAdmin } from '@/utils/userRoles';
import { formatFullDate } from '@/utils/dateFormatUtils';
import { Badge } from "@/components/ui/badge";

interface PropertyInfoProps {
  property: {
    name: string;
    address: string;
    contactNumber: string;
    email: string;
    practiceLeader: string;
    practiceLeaderEmail?: string;
    practiceLeaderPhone?: string;
    renewalDate?: string;
    rentAmount: number;
    rentPeriod?: 'week' | 'month';
    ownershipType?: 'sda' | 'rented' | 'owned';
  };
}

const ownershipTypeLabels: Record<'sda' | 'rented' | 'owned', string> = {
  sda: 'SDA',
  rented: 'Rented',
  owned: 'Owned',
};

const ownershipTypeVariants: Record<'sda' | 'rented' | 'owned', 'default' | 'secondary' | 'outline'> = {
  sda: 'default',
  rented: 'secondary',
  owned: 'outline',
};

export const PropertyInfo: React.FC<PropertyInfoProps> = ({ property }) => {
  const { currentUser } = useUserContext();
  const isAdmin = isUserAdmin(currentUser);
  
  const formatRentDisplay = () => {
    const period = property.rentPeriod || 'month';
    const amount = property.rentAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    
    // Calculate alternative period amount
    let alternativeAmount = '';
    if (property.rentAmount > 0) {
      if (period === 'week') {
        const monthlyAmount = (property.rentAmount * 52 / 12);
        alternativeAmount = ` (${monthlyAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}/month)`;
      } else {
        const weeklyAmount = (property.rentAmount * 12 / 52);
        alternativeAmount = ` (${weeklyAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}/week)`;
      }
    }

    return `${amount} per ${period}${alternativeAmount}`;
  };

  const ownershipType = property.ownershipType || 'rented';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Property Information</CardTitle>
        <CardDescription>Detailed information about the property</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Contact Information</h3>
              <div className="mt-2 space-y-2">
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{property.contactNumber}</span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{property.email}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Practice Leader</h3>
              <div className="mt-2 space-y-2">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{property.practiceLeader}</span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{property.practiceLeaderEmail || 'Not provided'}</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{property.practiceLeaderPhone || 'Not provided'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Property Details</h3>
              <div className="mt-2 space-y-2">
                <div className="flex items-center">
                  <Home className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="mr-2">Property Type:</span>
                  <Badge variant={ownershipTypeVariants[ownershipType]}>
                    {ownershipTypeLabels[ownershipType]}
                  </Badge>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>
                    Renewal Date: {property.renewalDate ? formatFullDate(property.renewalDate) : 'Not specified'}
                  </span>
                </div>
                {isAdmin && (
                  <div className="flex items-start">
                    <DollarSign className="h-4 w-4 mr-2 text-muted-foreground mt-0.5" />
                    <div className="flex flex-col">
                      <span className="font-medium">
                        Rent: {formatRentDisplay()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
