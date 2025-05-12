
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

const RequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  
  // Refs to control refresh behavior
  const lastRefreshTime = useRef<number>(0);
  const refreshPending = useRef<boolean>(false);
  const isInitialRender = useRef<boolean>(true);
  
  // Configure data fetching with smart refresh control
  const { 
    request, 
    loading, 
    quotes, 
    isContractor, 
    refreshData, 
    isRefreshing 
  } = useRequestDetailData(id);
  
  // Reset component state on ID change
  useEffect(() => {
    if (id) {
      console.log("RequestDetail - Request ID changed to:", id);
      lastRefreshTime.current = 0;
      refreshPending.current = false;
      
      // If not the initial render, reset the component state
      if (!isInitialRender.current) {
        console.log("RequestDetail - Not initial render, resetting state");
      } else {
        isInitialRender.current = false;
      }
    }
  }, [id]);
  
  // Smart refresh handler with debouncing and safety checks
  const handleRefreshData = () => {
    console.log("RequestDetail - Refresh requested");
    
    // Skip if already refreshing
    if (isRefreshing || refreshPending.current) {
      console.log("RequestDetail - Already refreshing or pending, skipping refresh request");
      return;
    }
    
    // Implement time-based throttling
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime.current;
    const MIN_REFRESH_INTERVAL = 10000; // 10 seconds
    
    if (timeSinceLastRefresh < MIN_REFRESH_INTERVAL) {
      console.log(`RequestDetail - Too soon since last refresh (${timeSinceLastRefresh}ms), debouncing`);
      
      if (!refreshPending.current) {
        console.log("RequestDetail - Setting refresh pending");
        refreshPending.current = true;
        
        // Schedule a refresh after the minimum interval has passed
        const delay = MIN_REFRESH_INTERVAL - timeSinceLastRefresh;
        console.log(`RequestDetail - Scheduling delayed refresh in ${delay}ms`);
        
        setTimeout(() => {
          console.log("RequestDetail - Executing delayed refresh");
          if (refreshData) {
            lastRefreshTime.current = Date.now();
            refreshPending.current = false;
            refreshData();
          }
        }, delay);
      }
      
      return;
    }
    
    // Execute immediate refresh if enough time has passed
    console.log("RequestDetail - Executing immediate refresh");
    if (refreshData) {
      lastRefreshTime.current = now;
      refreshData();
    }
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
