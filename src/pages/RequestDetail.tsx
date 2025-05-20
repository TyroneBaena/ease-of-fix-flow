
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { RequestInfo } from '@/components/request/RequestInfo';
import { CommentSection } from '@/components/request/CommentSection';
import { ContractorProvider } from '@/contexts/contractor';
import { RequestQuoteDialog } from '@/components/contractor/RequestQuoteDialog';
import { useRequestDetailData } from '@/hooks/useRequestDetailData';
import { RequestDetailHeader } from '@/components/request/detail/RequestDetailHeader';
import { RequestDetailSidebar } from '@/components/request/detail/RequestDetailSidebar';
import { RequestDetailLoading } from '@/components/request/detail/RequestDetailLoading';
import { RequestDetailNotFound } from '@/components/request/detail/RequestDetailNotFound';
import { Toaster } from "sonner";

const RequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [requestQuoteDialogOpen, setRequestQuoteDialogOpen] = useState(false);  // New state for request quote dialog
  
  // Block multiple refreshes
  const didInitialRenderRef = useRef(false);
  const manualRefreshBlockedRef = useRef(true);
  const pageVisibleRef = useRef(true);
  const quoteSubmissionInProgressRef = useRef(false);
  
  // Configure data fetching with controlled refresh
  const { 
    request, 
    loading, 
    quotes, 
    isContractor, 
    refreshData, 
    refreshAfterQuoteSubmission,
    isRefreshing 
  } = useRequestDetailData(id);
  
  // Handler for manual refresh with strict blocking
  const handleRefreshData = () => {
    console.log("RequestDetail - Manual refresh requested");
    
    if (manualRefreshBlockedRef.current) {
      console.log("RequestDetail - Manual refresh blocked: system protection active");
      return;
    }
    
    if (!pageVisibleRef.current) {
      console.log("RequestDetail - Manual refresh blocked: page not visible");
      return;
    }
    
    // Block if another operation is in progress
    if (quoteSubmissionInProgressRef.current) {
      console.log("RequestDetail - Manual refresh blocked: quote submission in progress");
      return;
    }
    
    console.log("RequestDetail - Executing controlled ONE-TIME refresh");
    refreshData();
    
    // Block further manual refreshes permanently
    manualRefreshBlockedRef.current = true;
  };
  
  // Special handler for quote submission with safety
  const handleQuoteSubmitted = () => {
    console.log("RequestDetail - Quote submitted, requesting controlled refresh");
    
    // Set the submission flag to prevent other refresh operations
    quoteSubmissionInProgressRef.current = true;
    
    // Use the specialized refresh function for quote submission
    refreshAfterQuoteSubmission();
    
    // Reset the submission flag after a delay
    setTimeout(() => {
      console.log("RequestDetail - Quote submission refresh completed");
      quoteSubmissionInProgressRef.current = false;
    }, 3000);
  };
  
  // Navigation handler
  const handleNavigateBack = () => navigate('/requests');

  // Block ALL visibility change refreshes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("RequestDetail - Tab visibility changed to visible");
        pageVisibleRef.current = true;
        // No refresh action on visibility change - COMPLETELY BLOCKED
      } else {
        console.log("RequestDetail - Tab visibility changed to hidden");
        pageVisibleRef.current = false;
      }
    };
    
    // Add visibility change listener
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      console.log("RequestDetail - Component unmounting, cleaning up");
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
  
  // Allow one manual refresh after initial load is complete
  useEffect(() => {
    if (!loading && request && !didInitialRenderRef.current) {
      didInitialRenderRef.current = true;
      console.log("RequestDetail - Initial load complete, enabling manual refresh");
      
      // Allow one manual refresh after a delay
      setTimeout(() => {
        manualRefreshBlockedRef.current = false;
      }, 5000);
    }
  }, [loading, request]);

  if (loading) {
    return <RequestDetailLoading />;
  }

  if (!request) {
    return <RequestDetailNotFound onBackClick={handleNavigateBack} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Toaster position="top-right" richColors />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RequestDetailHeader onBack={handleNavigateBack} />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <RequestInfo request={request} />
            <CommentSection requestId={id || ''} />
          </div>
          
          <ContractorProvider>
            <RequestDetailSidebar 
              request={request}
              quotes={quotes}
              isContractor={isContractor}
              onOpenQuoteDialog={() => setQuoteDialogOpen(true)}
              onOpenRequestQuoteDialog={() => setRequestQuoteDialogOpen(true)}  // New handler
              onRefreshData={handleRefreshData}
            />
            
            {/* Submit Quote Dialog - Used by contractors to submit quotes */}
            <RequestQuoteDialog 
              open={quoteDialogOpen} 
              onOpenChange={setQuoteDialogOpen} 
              request={request}
              onQuoteSubmitted={handleQuoteSubmitted}
            />
            
            {/* Request Quote Dialog - Used by property managers to request quotes from contractors */}
            <QuoteRequestDialog
              open={requestQuoteDialogOpen}
              onOpenChange={setRequestQuoteDialogOpen}
              requestDetails={request}
              onSubmitQuote={() => {
                // This is a placeholder function as we're not actually submitting a quote here
                // We're just closing the dialog for now
                handleQuoteSubmitted();
              }}
            />
          </ContractorProvider>
        </div>
      </main>
    </div>
  );
};

export default RequestDetail;
