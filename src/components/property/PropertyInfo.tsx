
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Mail, User, Calendar, DollarSign } from 'lucide-react';

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
  };
}

export const PropertyInfo: React.FC<PropertyInfoProps> = ({ property }) => {
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
              <h3 className="text-sm font-medium text-gray-500">Contact Information</h3>
              <div className="mt-2 space-y-2">
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-gray-500" />
                  <span>{property.contactNumber}</span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-gray-500" />
                  <span>{property.email}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Practice Leader</h3>
              <div className="mt-2 space-y-2">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2 text-gray-500" />
                  <span>{property.practiceLeader}</span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-gray-500" />
                  <span>{property.practiceLeaderEmail || 'Not provided'}</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-gray-500" />
                  <span>{property.practiceLeaderPhone || 'Not provided'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Rental Information</h3>
              <div className="mt-2 space-y-2">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  <span>
                    Renewal Date: {property.renewalDate ? new Date(property.renewalDate).toLocaleDateString() : 'Not specified'}
                  </span>
                </div>
                <div className="flex items-start">
                  <DollarSign className="h-4 w-4 mr-2 text-gray-500 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      Rent: {formatRentDisplay()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">QR Code</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-600 mb-2">
                  Scan this QR code to create a maintenance request for this property.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
