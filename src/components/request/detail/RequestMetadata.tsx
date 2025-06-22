
import React, { useState, useEffect } from 'react';
import { ParticipantInfo } from './metadata/ParticipantInfo';
import { LocationInfo } from './metadata/LocationInfo';
import { DateInfo } from './metadata/DateInfo';
import { SiteInfo } from './metadata/SiteInfo';
import { UserInfo } from './metadata/UserInfo';
import { supabase } from '@/lib/supabase';

interface RequestMetadataProps {
  isParticipantRelated: boolean;
  participantName?: string;
  location: string;
  reportDate: string;
  site: string;
  submittedBy: string;
  assignedTo?: string;
  contractorId?: string;
}

export const RequestMetadata = ({
  isParticipantRelated,
  participantName,
  location,
  reportDate,
  site,
  submittedBy,
  assignedTo,
  contractorId
}: RequestMetadataProps) => {
  const [contractorInfo, setContractorInfo] = useState<{
    companyName?: string;
    contactName?: string;
  } | null>(null);

  useEffect(() => {
    const fetchContractorInfo = async () => {
      if (contractorId) {
        try {
          const { data, error } = await supabase
            .from('contractors')
            .select('company_name, contact_name')
            .eq('id', contractorId)
            .single();

          if (!error && data) {
            setContractorInfo({
              companyName: data.company_name,
              contactName: data.contact_name
            });
          }
        } catch (err) {
          console.error('Error fetching contractor info:', err);
        }
      }
    };

    fetchContractorInfo();
  }, [contractorId]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <ParticipantInfo 
        isParticipantRelated={isParticipantRelated}
        participantName={participantName}
      />

      <LocationInfo location={location} />
      <DateInfo reportDate={reportDate} />
      <SiteInfo site={site} />
      
      <UserInfo label="Submitted By" value={submittedBy} />
      <UserInfo 
        label="Assigned To" 
        value={assignedTo || 'Unassigned'} 
        isContractor={!!contractorId}
        contractorInfo={contractorInfo}
      />
    </div>
  );
};
