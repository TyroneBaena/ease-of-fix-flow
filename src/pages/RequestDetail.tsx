
import React, { useState, useEffect, useCallback } from 'react';
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
  const [forceRefresh, setForceRefresh] = useState(0);
  const [lastRefreshCallTime, setLastRefreshCallTime] = useState(0);
  
  // Pass forceRefresh as a dependency to useRequestDetailData to trigger refetches
  const { request, loading, quotes, isContractor, refreshData, isRefreshing } = useRequestDetailData(id, forceRefresh);
  
  // Function to refresh the request data with double debounce protection
  const refreshRequestData = useCallback(() => {
    console.log("RequestDetail - Refreshing request data requested");
    
    // Debounce based on component state
    if (isRefreshing) {
      console.log("RequestDetail - Refresh already in progress, skipping");
      return;
    }
    
    // Time-based debouncing
    const currentTime = Date.now();
    if (currentTime - lastRefreshCallTime < 3000) { // 3 second window
      console.log("RequestDetail - Too soon since last refresh call, debouncing");
      return;
    }
    
    setLastRefreshCallTime(currentTime);
    
    // Use the hook's refreshData function
    if (refreshData) {
      console.log("RequestDetail - Calling refreshData");
      refreshData();
    }
  }, [refreshData, isRefreshing, lastRefreshCallTime]);
  
  // Add a debug-level effect to track renders
  useEffect(() => {
    console.log("RequestDetail - Component rendered with id:", id);
    console.log("RequestDetail - isRefreshing:", isRefreshing);
    console.log("RequestDetail - lastRefreshCallTime:", new Date(lastRefreshCallTime).toISOString());
  });
  
  const initialComments = [
    {
      id: '1',
      user: 'John Doe',
      role: 'Maintenance Supervisor',
      avatar: '/placeholder.svg',
      text: 'I\'ve assigned this to our electrical team. They will visit tomorrow morning between 9-11 AM. Please ensure access to the location.',
      timestamp: '2 days ago'
    },
    {
      id: '2',
      user: 'Sarah Smith',
      role: 'Requester',
      avatar: '/placeholder.svg',
      text: 'Thank you. I\'ll make sure someone is available to provide access during that time.',
      timestamp: '1 day ago'
    }
  ];

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
            <CommentSection initialComments={initialComments} />
          </div>
          
          <ContractorProvider>
            <RequestDetailSidebar 
              request={request}
              quotes={quotes}
              isContractor={isContractor}
              onOpenQuoteDialog={() => setQuoteDialogOpen(true)}
              onRefreshData={refreshRequestData}
            />
            
            <RequestQuoteDialog 
              open={quoteDialogOpen} 
              onOpenChange={setQuoteDialogOpen} 
              request={request}
              onQuoteSubmitted={refreshRequestData}
            />
          </ContractorProvider>
        </div>
      </main>
    </div>
  );
};

export default RequestDetail;
