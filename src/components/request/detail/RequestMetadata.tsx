
import React from 'react';
import { CheckCircle, User, MapPin, Calendar, Tag } from 'lucide-react';

interface RequestMetadataProps {
  isParticipantRelated: boolean;
  participantName?: string;
  location: string;
  reportDate: string;
  site: string;
  submittedBy: string;
  assignedTo?: string;
}

export const RequestMetadata = ({
  isParticipantRelated,
  participantName,
  location,
  reportDate,
  site,
  submittedBy,
  assignedTo
}: RequestMetadataProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <div className="flex items-center">
        <CheckCircle className="h-4 w-4 text-gray-500 mr-2" />
        <div>
          <p className="text-xs text-gray-500">Participant Related</p>
          <p className="font-medium">{isParticipantRelated ? 'Yes' : 'No'}</p>
        </div>
      </div>
      {participantName && participantName !== 'N/A' && (
        <div className="flex items-center">
          <User className="h-4 w-4 text-gray-500 mr-2" />
          <div>
            <p className="text-xs text-gray-500">Participant Name</p>
            <p className="font-medium">{participantName}</p>
          </div>
        </div>
      )}
      <div className="flex items-center">
        <MapPin className="h-4 w-4 text-gray-500 mr-2" />
        <div>
          <p className="text-xs text-gray-500">Location</p>
          <p className="font-medium">{location}</p>
        </div>
      </div>
      <div className="flex items-center">
        <Calendar className="h-4 w-4 text-gray-500 mr-2" />
        <div>
          <p className="text-xs text-gray-500">Report Date</p>
          <p className="font-medium">{reportDate}</p>
        </div>
      </div>
      <div className="flex items-center">
        <Tag className="h-4 w-4 text-gray-500 mr-2" />
        <div>
          <p className="text-xs text-gray-500">Site</p>
          <p className="font-medium">{site}</p>
        </div>
      </div>
      <div className="flex items-center">
        <User className="h-4 w-4 text-gray-500 mr-2" />
        <div>
          <p className="text-xs text-gray-500">Submitted By</p>
          <p className="font-medium">{submittedBy}</p>
        </div>
      </div>
      <div className="flex items-center">
        <User className="h-4 w-4 text-gray-500 mr-2" />
        <div>
          <p className="text-xs text-gray-500">Assigned To</p>
          <p className="font-medium">{assignedTo || 'Unassigned'}</p>
        </div>
      </div>
    </div>
  );
};
