
import React from 'react';
import { Phone, Mail, User, MapPin, Building } from 'lucide-react';

interface ContactInformationProps {
  site?: string;
  address?: string;
  submittedBy?: string;
  contactNumber?: string;
  practiceLeader?: string;
  practiceLeaderPhone?: string;
  practiceLeaderEmail?: string;
}

export const ContactInformation = ({
  site,
  address,
  submittedBy,
  contactNumber,
  practiceLeader,
  practiceLeaderPhone,
  practiceLeaderEmail
}: ContactInformationProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Site Details</h3>
      
      {/* Prominent site details section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
          <Building className="h-4 w-4 mr-2" />
          Property Information
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {site && (
            <div className="flex items-start space-x-2">
              <Building className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <span className="text-sm font-medium text-blue-900">Site:</span>
                <p className="text-sm text-blue-800">{site}</p>
              </div>
            </div>
          )}
          
          {address && (
            <div className="flex items-start space-x-2">
              <MapPin className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <span className="text-sm font-medium text-blue-900">Address:</span>
                <p className="text-sm text-blue-800">{address}</p>
              </div>
            </div>
          )}
          
          {contactNumber && (
            <div className="flex items-start space-x-2">
              <Phone className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <span className="text-sm font-medium text-blue-900">Site Phone:</span>
                <p className="text-sm text-blue-800">{contactNumber}</p>
              </div>
            </div>
          )}
          
          {practiceLeader && (
            <div className="flex items-start space-x-2">
              <User className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <span className="text-sm font-medium text-blue-900">Practice Leader:</span>
                <p className="text-sm text-blue-800">{practiceLeader}</p>
              </div>
            </div>
          )}
          
          {practiceLeaderPhone && (
            <div className="flex items-start space-x-2">
              <Phone className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <span className="text-sm font-medium text-blue-900">Practice Leader Phone:</span>
                <p className="text-sm text-blue-800">{practiceLeaderPhone}</p>
              </div>
            </div>
          )}
          
          {practiceLeaderEmail && (
            <div className="flex items-start space-x-2">
              <Mail className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <span className="text-sm font-medium text-blue-900">Practice Leader Email:</span>
                <p className="text-sm text-blue-800">{practiceLeaderEmail}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Additional contact information */}
      {submittedBy && (
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-gray-600" />
            <div>
              <span className="text-sm font-medium text-gray-700">Submitted by:</span>
              <p className="text-sm text-gray-600">{submittedBy}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
