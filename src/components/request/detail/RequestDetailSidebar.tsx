
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
  // Use a ref to track if refresh has been called already
  const hasRefreshedRef = useRef(false);
  const buttonClickTimeRef = useRef(0);
  
  // Single-execution refresh handler
  const handleContractorAssigned = useCallback(() => {
    console.log("RequestDetailSidebar - Contractor assigned/changed, checking if refresh allowed");
    
    // Only allow refresh once per component lifecycle
    if (hasRefreshedRef.current) {
      console.log("RequestDetailSidebar - Already refreshed once, preventing additional refreshes");
      return;
    }
    
    // Mark as refreshed
    hasRefreshedRef.current = true;
    
    // Only call refresh if provided
    if (onRefreshData) {
      console.log("RequestDetailSidebar - Executing ONE-TIME refresh");
      onRefreshData();
    }
  }, [onRefreshData]);

  // Add debouncing for button click 
  const handleSubmitQuoteClick = () => {
    const now = Date.now();
    // Prevent multiple rapid clicks (1 second cooldown)
    if (now - buttonClickTimeRef.current < 1000) {
      return;
    }
    buttonClickTimeRef.current = now;
    onOpenQuoteDialog();
  };

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
          onClick={handleSubmitQuoteClick}
          className="w-full"
        >
          Submit Quote
        </Button>
      )}
    </div>
  );
};
