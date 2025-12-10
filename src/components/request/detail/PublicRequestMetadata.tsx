import React from 'react';
import { ParticipantInfo } from './metadata/ParticipantInfo';
import { LocationInfo } from './metadata/LocationInfo';
import { DateInfo } from './metadata/DateInfo';
import { SiteInfo } from './metadata/SiteInfo';
import { UserInfo } from './metadata/UserInfo';
import { PropertyInfo } from './metadata/PropertyInfo';

interface PublicRequestMetadataProps {
  isParticipantRelated: boolean;
  participantName?: string;
  location: string;
  reportDate: string;
  site: string;
  submittedBy: string;
  assignedTo?: string;
  contractorId?: string;
  propertyId?: string;
  propertyName?: string;
  assignedToLandlord?: boolean;
  contractorInfo?: {
    companyName?: string;
    contactName?: string;
  } | null;
}

/**
 * Public version of RequestMetadata that accepts contractorInfo as a prop
 * instead of fetching it from the database (which requires authentication)
 */
export const PublicRequestMetadata = ({
  isParticipantRelated,
  participantName,
  location,
  reportDate,
  site,
  submittedBy,
  assignedTo,
  contractorId,
  propertyId,
  propertyName,
  assignedToLandlord,
  contractorInfo
}: PublicRequestMetadataProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <ParticipantInfo 
        isParticipantRelated={isParticipantRelated}
        participantName={participantName}
      />

      <PropertyInfo propertyId={propertyId} propertyName={propertyName} />
      <LocationInfo location={location} />
      <DateInfo reportDate={reportDate} />
      <SiteInfo site={site} />
      
      <UserInfo label="Submitted By" value={submittedBy} />
      <UserInfo 
        label="Assigned To" 
        value={assignedToLandlord ? 'Landlord' : (contractorInfo?.companyName || assignedTo || 'Unassigned')} 
        isContractor={!!contractorId && !assignedToLandlord}
        contractorInfo={!assignedToLandlord ? (contractorInfo || undefined) : undefined}
      />
    </div>
  );
};
