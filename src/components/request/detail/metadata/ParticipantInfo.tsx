
import React from 'react';
import { CheckCircle, User } from 'lucide-react';

interface ParticipantInfoProps {
  isParticipantRelated: boolean;
  participantName?: string;
}

export const ParticipantInfo = ({ isParticipantRelated, participantName }: ParticipantInfoProps) => {
  return (
    <>
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
    </>
  );
};
