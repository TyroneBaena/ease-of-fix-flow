
import React from 'react';
import { MaintenanceRequest } from '@/types/maintenance';
import { ContractorAssignment } from '@/components/request/ContractorAssignment';
import { RequestActions } from '@/components/request/RequestActions';
import { RequestHistory } from '@/components/request/RequestHistory';
import { JobProgressCard } from '@/components/contractor/JobProgressCard';
import { QuotesList } from '@/components/request/QuotesList';
import { Quote } from '@/types/contractor';

interface RequestDetailSidebarProps {
  request: MaintenanceRequest;
  quotes: Quote[];
  isContractor: boolean;
  onOpenQuoteDialog: () => void;
}

export const RequestDetailSidebar = ({ 
  request, 
  quotes,
  isContractor,
  onOpenQuoteDialog
}: RequestDetailSidebarProps) => {
  // Is this request assigned to the current contractor?
  const isContractorAssigned = isContractor && request.contractorId && request.status === 'in-progress';

  return (
    <div className="space-y-6">
      {/* Show contractor assignment panel if user is not a contractor */}
      {!isContractor && (
        <ContractorAssignment 
          requestId={request.id} 
          isAssigned={request.contractorId ? true : false}
          onOpenQuoteDialog={onOpenQuoteDialog}
        />
      )}
      
      {/* Show quotes list if quotes exist */}
      {quotes.length > 0 && !isContractor && (
        <QuotesList requestId={request.id} quotes={quotes} />
      )}
      
      {/* For assigned contractors or admin/manager, show job progress */}
      {request.contractorId && (
        <JobProgressCard 
          request={request} 
          isContractor={isContractorAssigned} 
        />
      )}
      
      {!isContractor && (
        <>
          <RequestActions status={request.status} />
          <RequestHistory history={request.history} />
        </>
      )}
    </div>
  );
};
