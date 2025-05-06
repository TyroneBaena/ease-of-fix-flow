
import React, { useEffect, useState } from 'react';
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
  
  // State to track if a contractor is assigned to the request
  const [isAssigned, setIsAssigned] = useState(!!request.contractorId);
  
  // Debug information to help troubleshoot
  useEffect(() => {
    console.log("RequestDetailSidebar - Component mounted or updated");
    console.log("RequestDetailSidebar - isContractor:", isContractor);
    console.log("RequestDetailSidebar - request.contractorId:", request.contractorId);
    console.log("RequestDetailSidebar - request.status:", request.status);
    console.log("RequestDetailSidebar - isAssigned state:", isAssigned);
    
    // Update isAssigned when request.contractorId changes
    if (request.contractorId !== undefined) {
      const newIsAssigned = !!request.contractorId;
      if (isAssigned !== newIsAssigned) {
        console.log("RequestDetailSidebar - Updating isAssigned to:", newIsAssigned);
        setIsAssigned(newIsAssigned);
      }
    }
  }, [request.contractorId, isContractor, request.status, isAssigned]);

  // Handler for when a contractor is assigned
  const handleContractorAssigned = () => {
    console.log("RequestDetailSidebar - Contractor assigned, updating UI");
    setIsAssigned(true);
    
    // We could fetch the updated request data here instead of reloading the page
    // For now, we'll just update our local state
  };

  return (
    <div className="space-y-6">
      {/* Show contractor assignment panel if user is not a contractor and no contractor is assigned yet */}
      {!isContractor && !isAssigned && (
        <ContractorAssignment 
          requestId={request.id} 
          isAssigned={isAssigned}
          onOpenQuoteDialog={onOpenQuoteDialog}
          onContractorAssigned={handleContractorAssigned}
        />
      )}
      
      {/* Show quotes list if quotes exist */}
      {quotes.length > 0 && !isContractor && (
        <QuotesList requestId={request.id} quotes={quotes} />
      )}
      
      {/* For assigned contractors or admin/manager, show job progress */}
      {isAssigned && (
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
