
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
  const refreshAllowedRef = useRef(true);
  
  // Configure data fetching with controlled refresh
  const { 
    request, 
    loading, 
    quotes, 
    isContractor, 
    refreshData, 
    isRefreshing 
  } = useRequestDetailData(id);
  
  // Controlled refresh handler that only allows one refresh per session
  const handleRefreshData = () => {
    console.log("RequestDetail - Refresh requested, checking if allowed");
    
    if (!refreshAllowedRef.current) {
      console.log("RequestDetail - Refresh not allowed, already refreshed once");
      return;
    }
    
    // Mark as used - only one refresh per page visit
    refreshAllowedRef.current = false;
    
    console.log("RequestDetail - Executing controlled ONE-TIME refresh");
    refreshData();
    
    // Reset the flag after a significant delay, in case user stays on page
    setTimeout(() => {
      console.log("RequestDetail - Resetting refresh flag after cooldown");
      refreshAllowedRef.current = true;
    }, 10000); // 10 second cooldown
  };
  
  const handleNavigateBack = () => navigate('/requests');

  // Reset refresh allowed flag when component mounts or ID changes
  useEffect(() => {
    console.log("RequestDetail - Component mounted or ID changed, resetting refresh allowed flag");
    refreshAllowedRef.current = true;
    
    return () => {
      console.log("RequestDetail - Component unmounting, cleaning up");
    };
  }, [id]);

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
