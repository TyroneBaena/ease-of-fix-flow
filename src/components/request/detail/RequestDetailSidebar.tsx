
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
  const refreshCountRef = useRef(0);

  // Memoized handler for contractor assignment to prevent recreation on every render
  // with stricter debouncing to prevent multiple rapid refreshes
  const handleContractorAssigned = useCallback(() => {
    console.log("RequestDetailSidebar - Contractor assigned/changed, throttling refresh");
    
    // Increment refresh count to track how many times this is called
    refreshCountRef.current += 1;
    console.log(`RequestDetailSidebar - Refresh requested #${refreshCountRef.current}`);
    
    // Skip if already refreshing
    if (isRefreshingRef.current) {
      console.log("RequestDetailSidebar - Already refreshing, skipping refresh request");
      return;
    }
    
    // Hard limit on number of refreshes to prevent infinite loops
    if (refreshCountRef.current > 3) {
      console.log("RequestDetailSidebar - Maximum refresh count reached, blocking further refreshes");
      return;
    }
    
    // Set refreshing flag
    isRefreshingRef.current = true;
    
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
    }
    
    // Set a new timeout with a longer delay to ensure all operations complete
    refreshTimeoutRef.current = window.setTimeout(() => {
      console.log("RequestDetailSidebar - Executing refresh after delay");
      
      // Only call refresh once
      if (onRefreshData) {
        onRefreshData();
      }
      
      // Reset the refreshing state after a much longer delay
      setTimeout(() => {
        console.log("RequestDetailSidebar - Refresh cycle complete, resetting state");
        isRefreshingRef.current = false;
        refreshTimeoutRef.current = null;
      }, 10000); // Much longer cooldown period
    }, 3000); // Longer initial delay
    
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
