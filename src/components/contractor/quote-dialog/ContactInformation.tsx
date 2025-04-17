
import React from 'react';
import { Building, MapPin, User, Phone } from 'lucide-react';

interface ContactInformationProps {
  site?: string;
  address?: string;
  submittedBy?: string;
  contactNumber?: string;
  practiceLeader?: string;
  practiceLeaderPhone?: string;
}

export const ContactInformation: React.FC<ContactInformationProps> = ({
  site,
  address,
  submittedBy,
  contactNumber,
  practiceLeader,
  practiceLeaderPhone,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Contact Information</h3>
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <Building className="h-4 w-4 mt-1 text-gray-500 flex-shrink-0" />
          <div className="flex-grow">
            <p className="text-sm font-medium">Site</p>
            <p className="text-sm text-gray-600 break-words">{site || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 mt-1 text-gray-500 flex-shrink-0" />
          <div className="flex-grow">
            <p className="text-sm font-medium">Address</p>
            <p className="text-sm text-gray-600 break-words">{address || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <User className="h-4 w-4 mt-1 text-gray-500 flex-shrink-0" />
          <div className="flex-grow">
            <p className="text-sm font-medium">Submitted By</p>
            <p className="text-sm text-gray-600">{submittedBy || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Phone className="h-4 w-4 mt-1 text-gray-500 flex-shrink-0" />
          <div className="flex-grow">
            <p className="text-sm font-medium">Contact Number</p>
            <p className="text-sm text-gray-600">{contactNumber || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <User className="h-4 w-4 mt-1 text-gray-500 flex-shrink-0" />
          <div className="flex-grow">
            <p className="text-sm font-medium">Practice Leader</p>
            <p className="text-sm text-gray-600">{practiceLeader || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Phone className="h-4 w-4 mt-1 text-gray-500 flex-shrink-0" />
          <div className="flex-grow">
            <p className="text-sm font-medium">Practice Leader Phone</p>
            <p className="text-sm text-gray-600">{practiceLeaderPhone || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
