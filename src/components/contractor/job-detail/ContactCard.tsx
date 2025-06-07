
import React from 'react';
import { Card } from '@/components/ui/card';
import { Phone, Mail, MapPin, User } from 'lucide-react';

interface ContactCardProps {
  practiceLeader: string;
  practiceLeaderPhone: string;
  practiceLeaderEmail: string;
  address: string;
}

export const ContactCard = ({ 
  practiceLeader, 
  practiceLeaderPhone, 
  practiceLeaderEmail,
  address 
}: ContactCardProps) => {
  return (
    <Card className="p-6">
      <h2 className="font-semibold text-lg mb-4">Contact Information</h2>
      
      <div className="space-y-4">
        {practiceLeader && (
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Practice Leader</p>
              <p className="font-medium">{practiceLeader}</p>
            </div>
          </div>
        )}
        
        {practiceLeaderEmail && (
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Practice Leader Email</p>
              <a 
                href={`mailto:${practiceLeaderEmail}`}
                className="font-medium text-blue-600 hover:text-blue-800"
              >
                {practiceLeaderEmail}
              </a>
            </div>
          </div>
        )}
        
        {practiceLeaderPhone && (
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <a 
                href={`tel:${practiceLeaderPhone}`}
                className="font-medium text-blue-600 hover:text-blue-800"
              >
                {practiceLeaderPhone}
              </a>
            </div>
          </div>
        )}
        
        {address && (
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Property Address</p>
              <p className="font-medium">{address}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
