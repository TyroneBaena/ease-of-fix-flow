
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [refreshTriggered, setRefreshTriggered] = useState(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Pass forceRefresh as a dependency to useRequestDetailData to trigger refetches
  const { request, loading, quotes, isContractor, refreshData, isRefreshing } = useRequestDetailData(id);
  
  // Function to refresh the request data with throttling to prevent loops
  const handleRefreshData = useCallback(() => {
    console.log("RequestDetail - Controlled refresh requested");
    
    // Skip if a refresh is already pending
    if (refreshTriggered) {
      console.log("RequestDetail - Refresh already triggered, skipping");
      return;
    }
    
    // Set flag that refresh was triggered to prevent multiple calls
    setRefreshTriggered(true);
    
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // Delay the actual refresh to prevent rapid successive calls
    refreshTimeoutRef.current = setTimeout(() => {
      console.log("RequestDetail - Executing delayed refresh");
      
      if (refreshData) {
        refreshData().finally(() => {
          // Reset the flag after refresh completes
          console.log("RequestDetail - Refresh complete, resetting flag");
          
          // Add a delay before allowing another refresh
          setTimeout(() => {
            setRefreshTriggered(false);
          }, 5000);
        });
      } else {
        setRefreshTriggered(false);
      }
      
      refreshTimeoutRef.current = null;
    }, 1000) as unknown as NodeJS.Timeout;
    
  }, [refreshData, refreshTriggered]);
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);
  
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
