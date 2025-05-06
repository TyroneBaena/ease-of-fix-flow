
import React, { useEffect, useState } from 'react';
import { MaintenanceRequest } from '@/types/maintenance';
import { ContractorAssignment } from '@/components/request/ContractorAssignment';
import { RequestActions } from '@/components/request/RequestActions';
import { RequestHistory } from '@/components/request/RequestHistory';
import { JobProgressCard } from '@/components/contractor/JobProgressCard';
import { QuotesList } from '@/components/request/QuotesList';
import { Quote } from '@/types/contractor';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

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
  const [isAssigned, setIsAssigned] = useState(false);
  // State to track if we're changing a contractor
  const [isChangingContractor, setIsChangingContractor] = useState(false);
  
  // Update isAssigned when request changes
  useEffect(() => {
    // Check assignment based on contractorId and assignedTo
    const newIsAssigned = !!request.contractorId || !!request.assignedTo;
    console.log("RequestDetailSidebar - Checking assignment status:", {
      contractorId: request.contractorId,
      assignedTo: request.assignedTo,
      isAssigned: newIsAssigned
    });
    setIsAssigned(newIsAssigned);
  }, [request.contractorId, request.assignedTo]);
  
  // Debug information to help troubleshoot
  useEffect(() => {
    console.log("RequestDetailSidebar - Component mounted or updated");
    console.log("RequestDetailSidebar - isContractor:", isContractor);
    console.log("RequestDetailSidebar - request.contractorId:", request.contractorId);
    console.log("RequestDetailSidebar - request.assignedTo:", request.assignedTo);
    console.log("RequestDetailSidebar - request.status:", request.status);
    console.log("RequestDetailSidebar - isAssigned state:", isAssigned);
    console.log("RequestDetailSidebar - isChangingContractor state:", isChangingContractor);
  }, [request.contractorId, request.assignedTo, isContractor, request.status, isAssigned, isChangingContractor]);

  // Handler for when a contractor is assigned
  const handleContractorAssigned = () => {
    console.log("RequestDetailSidebar - Contractor assigned, updating UI");
    setIsAssigned(true);
    setIsChangingContractor(false);
  };

  // Handler to toggle contractor change mode
  const handleChangeContractor = () => {
    console.log("RequestDetailSidebar - Toggling change contractor mode");
    setIsChangingContractor(!isChangingContractor);
  };

  return (
    <div className="space-y-6">
      {/* Show contractor assignment panel if user is not a contractor and either:
          1. No contractor is assigned yet, or
          2. User has clicked to change the contractor */}
      {!isContractor && (!isAssigned || isChangingContractor) && (
        <ContractorAssignment 
          requestId={request.id} 
          isAssigned={isAssigned}
          currentContractorId={request.contractorId}
          onOpenQuoteDialog={onOpenQuoteDialog}
          onContractorAssigned={handleContractorAssigned}
        />
      )}
      
      {/* Show change contractor button if a contractor is already assigned and we're not in change mode */}
      {!isContractor && isAssigned && !isChangingContractor && (
        <div className="mb-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleChangeContractor}
            className="flex items-center"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Change Contractor
          </Button>
        </div>
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
