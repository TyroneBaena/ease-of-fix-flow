
import React, { useCallback, useRef } from 'react';
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
  // Use a ref to prevent multiple refreshes in quick succession
  const refreshTimeoutRef = useRef<number | null>(null);
  const isRefreshingRef = useRef(false);

  // Memoized handler for contractor assignment to prevent recreation on every render
  // with debouncing to prevent multiple rapid refreshes
  const handleContractorAssigned = useCallback(() => {
    console.log("RequestDetailSidebar - Contractor assigned/changed, throttling refresh");
    
    // Skip if already refreshing
    if (isRefreshingRef.current) {
      console.log("RequestDetailSidebar - Already refreshing, skipping refresh request");
      return;
    }
    
    // Set refreshing flag
    isRefreshingRef.current = true;
    
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
    }
    
    // Set a new timeout to prevent multiple refreshes
    refreshTimeoutRef.current = window.setTimeout(() => {
      console.log("RequestDetailSidebar - Executing refresh after delay");
      if (onRefreshData) {
        onRefreshData();
      }
      
      // Reset the refreshing state after a short delay
      setTimeout(() => {
        isRefreshingRef.current = false;
        refreshTimeoutRef.current = null;
      }, 5000);
    }, 1000);
    
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
