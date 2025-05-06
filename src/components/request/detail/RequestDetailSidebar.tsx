
import React, { useEffect } from 'react';
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
  
  // Debug information to help troubleshoot
  useEffect(() => {
    console.log("RequestDetailSidebar - Component mounted or updated");
    console.log("RequestDetailSidebar - isContractor:", isContractor);
    console.log("RequestDetailSidebar - request.contractorId:", request.contractorId);
    console.log("RequestDetailSidebar - request.status:", request.status);
    console.log("RequestDetailSidebar - showing ContractorAssignment:", !isContractor && !request.contractorId);
  }, [isContractor, request.contractorId, request.status]);

  return (
    <div className="space-y-6">
      {/* Show contractor assignment panel if user is not a contractor and no contractor is assigned yet */}
      {!isContractor && !request.contractorId && (
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
