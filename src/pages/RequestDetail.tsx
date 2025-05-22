
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { RequestInfo } from '@/components/request/RequestInfo';
import { CommentSection } from '@/components/request/CommentSection';
import { ContractorProvider } from '@/contexts/contractor';
import { RequestQuoteDialog } from '@/components/contractor/RequestQuoteDialog';
import { QuoteRequestDialog } from '@/components/contractor/QuoteRequestDialog';
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
  const [requestQuoteDialogOpen, setRequestQuoteDialogOpen] = useState(false);
  
  // Stabilize ID reference to prevent effect reruns
  const stableIdRef = useRef(id);
  
  // Block multiple refreshes with refs
  const quoteSubmissionInProgressRef = useRef(false);
  const componentMountedRef = useRef(true);
  
  // Configure data fetching with controlled refresh
  const { 
    request, 
    loading, 
    quotes, 
    isContractor, 
    refreshData, 
    refreshAfterQuoteSubmission,
    isRefreshing 
  } = useRequestDetailData(stableIdRef.current);
  
  // Reset component on unmount
  useEffect(() => {
    componentMountedRef.current = true;
    return () => {
      componentMountedRef.current = false;
    };
  }, []);
  
  // Handler for manual refresh with debounce protection
  const handleRefreshData = useCallback(() => {
    if (!componentMountedRef.current || quoteSubmissionInProgressRef.current) {
      return;
    }
    refreshData();
  }, [refreshData]);
  
  // Special handler for quote submission with safety
  const handleQuoteSubmitted = useCallback(() => {
    if (!componentMountedRef.current) return;
    
    quoteSubmissionInProgressRef.current = true;
    refreshAfterQuoteSubmission();
    
    setTimeout(() => {
      if (componentMountedRef.current) {
        quoteSubmissionInProgressRef.current = false;
      }
    }, 3000);
  }, [refreshAfterQuoteSubmission]);
  
  // Navigation handler - memoized to prevent rerenders
  const handleNavigateBack = useCallback(() => navigate('/requests'), [navigate]);

  if (loading) {
    return <RequestDetailLoading />;
  }

  if (!request) {
    return <RequestDetailNotFound onBackClick={handleNavigateBack} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
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
              onOpenRequestQuoteDialog={() => setRequestQuoteDialogOpen(true)}
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
              onSubmitQuote={handleQuoteSubmitted}
            />
          </ContractorProvider>
        </div>
      </main>
      
      <Toaster position="top-right" />
    </div>
  );
};

export default RequestDetail;
