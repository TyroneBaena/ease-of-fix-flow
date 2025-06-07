
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, User } from 'lucide-react';

interface ContactCardProps {
  practiceLeader?: string;
  practiceLeaderPhone?: string;
  address?: string;
  practiceLeaderEmail?: string;
}

export const ContactCard = ({ 
  practiceLeader, 
  practiceLeaderPhone, 
  address, 
  practiceLeaderEmail 
}: ContactCardProps) => {
  
  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const handleDirections = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://maps.google.com/?q=${encodedAddress}`, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Phone className="h-5 w-5 mr-2" />
          Contact Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Practice Leader */}
        {practiceLeader && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Practice Leader</p>
                <p className="text-sm text-gray-900 font-semibold">{practiceLeader}</p>
              </div>
            </div>
          </div>
        )}

        {/* Phone */}
        {practiceLeaderPhone && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="text-sm text-gray-900">{practiceLeaderPhone}</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handleCall(practiceLeaderPhone)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Phone className="h-4 w-4 mr-1" />
                Call
              </Button>
            </div>
          </div>
        )}

        {/* Email */}
        {practiceLeaderEmail && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-sm text-gray-900">{practiceLeaderEmail}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEmail(practiceLeaderEmail)}
              >
                <Mail className="h-4 w-4 mr-1" />
                Email
              </Button>
            </div>
          </div>
        )}

        {/* Address */}
        {address && (
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Address</p>
                  <p className="text-sm text-gray-900 whitespace-pre-line">{address}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDirections(address)}
                className="ml-2 flex-shrink-0"
              >
                <MapPin className="h-4 w-4 mr-1" />
                Directions
              </Button>
            </div>
          </div>
        )}

        {/* Show message if no contact info available */}
        {!practiceLeader && !practiceLeaderPhone && !practiceLeaderEmail && !address && (
          <div className="text-center py-6 text-muted-foreground">
            <Phone className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No contact information available</p>
            <p className="text-sm">Contact details will be provided when available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
