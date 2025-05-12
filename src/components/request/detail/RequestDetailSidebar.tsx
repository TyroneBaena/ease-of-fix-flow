
import React, { useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { ContractorAssignment } from '@/components/request/ContractorAssignment';
import { RequestActions } from '@/components/request/RequestActions';
import { QuotesList } from '@/components/request/QuotesList';
import { JobProgressCard } from '@/components/contractor/JobProgressCard';
import { MaintenanceRequest } from '@/types/maintenance';

interface RequestDetailSidebarProps {
  request: MaintenanceRequest;
  quotes: any[];
  isContractor: boolean;
  onOpenQuoteDialog: () => void;
  onRefreshData?: () => void;
}

export const RequestDetailSidebar = ({
  request,
  quotes,
  isContractor,
  onOpenQuoteDialog,
  onRefreshData
}: RequestDetailSidebarProps) => {
  // Memoized handler for contractor assignment to prevent recreation on every render
  const handleContractorAssigned = useCallback(() => {
    console.log("RequestDetailSidebar - Contractor assigned/changed, triggering refresh");
    if (onRefreshData) {
      onRefreshData();
    }
  }, [onRefreshData]);

  return (
    <div className="space-y-6">
      <ContractorAssignment 
        requestId={request.id}
        isAssigned={!!request.contractorId}
        currentContractorId={request.contractorId}
        onOpenQuoteDialog={onOpenQuoteDialog}
        onContractorAssigned={handleContractorAssigned}
      />
      
      {quotes && quotes.length > 0 && (
        <QuotesList 
          quotes={quotes} 
          requestId={request.id}
        />
      )}
      
      <RequestActions 
        status={request.status} 
        requestId={request.id}
        onStatusChange={onRefreshData}
      />
      
      {(request.contractorId || request.completionPercentage > 0) && (
        <JobProgressCard
          request={request}
          isContractor={isContractor}
        />
      )}
      
      {isContractor && request.status !== 'completed' && (
        <Button 
          onClick={onOpenQuoteDialog}
          className="w-full"
        >
          Submit Quote
        </Button>
      )}
    </div>
  );
};
