
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
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const refreshInProgressRef = useRef(false);
  
  // Configure data fetching with refresh disabled for troubleshooting
  const { 
    request, 
    loading, 
    quotes, 
    isContractor, 
    refreshData, 
    isRefreshing 
  } = useRequestDetailData(id);
  
  // DISABLED for troubleshooting - won't refresh automatically
  const handleRefreshData = () => {
    console.log("RequestDetail - Refresh DISABLED for troubleshooting");
    // Uncomment to re-enable
    /*
    console.log("RequestDetail - Refresh requested");
    
    // Skip if already refreshing
    if (isRefreshing || refreshInProgressRef.current) {
      console.log("RequestDetail - Already refreshing or in progress, skipping refresh request");
      return;
    }
    
    // Implement time-based throttling (10 seconds between page-level refreshes)
    const now = Date.now();
    const MIN_REFRESH_INTERVAL = 10000; // 10 seconds
    
    if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) {
      console.log(`RequestDetail - Too soon since last refresh (${now - lastRefreshTime}ms), throttling`);
      return;
    }
    
    // Set flags to prevent multiple refreshes
    refreshInProgressRef.current = true;
    setLastRefreshTime(now);
    
    console.log("RequestDetail - Starting controlled refresh operation");
    
    // Add a delay before refreshing to let operations complete
    setTimeout(() => {
      refreshData();
      
      // Reset the flag after a significant delay
      setTimeout(() => {
        refreshInProgressRef.current = false;
      }, 5000);
    }, 1000);
    */
  };
  
  const handleNavigateBack = () => navigate('/requests');

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
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              onRefreshData={handleRefreshData}
            />
            
            <RequestQuoteDialog 
              open={quoteDialogOpen} 
              onOpenChange={setQuoteDialogOpen} 
              request={request}
              onQuoteSubmitted={handleRefreshData}
            />
          </ContractorProvider>
        </div>
      </main>
    </div>
  );
};

export default RequestDetail;
