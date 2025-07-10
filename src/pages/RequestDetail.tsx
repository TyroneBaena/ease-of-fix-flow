
import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { RequestInfo } from '@/components/request/RequestInfo';
import { CommentSection } from '@/components/request/CommentSection';
// import { RequestHistory } from '@/components/request/RequestHistory';
import { ActivityTimeline } from '@/components/request/ActivityTimeline';
import { ContractorProvider } from '@/contexts/contractor';
import { RequestQuoteDialog } from '@/components/contractor/RequestQuoteDialog';
import { QuoteRequestDialog } from '@/components/contractor/QuoteRequestDialog';
import { useRequestDetailData } from '@/hooks/useRequestDetailData';
import { useComments } from '@/hooks/useComments';
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
  
  const { 
    request, 
    loading, 
    quotes, 
    isContractor, 
    refreshData, 
    refreshAfterQuoteSubmission,
    isRefreshing 
  } = useRequestDetailData(id);

  // Get comments for the activity timeline
  const { comments } = useComments(id || '');
  
  // Navigation handler
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
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RequestDetailHeader onBack={handleNavigateBack} />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <RequestInfo request={request} />
            <ActivityTimeline 
              request={request} 
              comments={comments}
            />
            <CommentSection requestId={id || ''} />
            {/* <RequestHistory 
              request={request} 
              comments={comments}
              history={request.history} 
            /> */}
          </div>
          
          <ContractorProvider>
            <RequestDetailSidebar 
              request={request}
              quotes={quotes}
              isContractor={isContractor}
              onOpenQuoteDialog={() => setQuoteDialogOpen(true)}
              onOpenRequestQuoteDialog={() => setRequestQuoteDialogOpen(true)}
              onRefreshData={refreshData}
            />
            
            {/* Submit Quote Dialog - Used by contractors to submit quotes */}
            <RequestQuoteDialog 
              open={quoteDialogOpen} 
              onOpenChange={setQuoteDialogOpen} 
              request={request}
              onQuoteSubmitted={refreshAfterQuoteSubmission}
            />
            
            {/* Request Quote Dialog - Used by property managers to request quotes from contractors */}
            <QuoteRequestDialog
              open={requestQuoteDialogOpen}
              onOpenChange={setRequestQuoteDialogOpen}
              requestDetails={request}
              onSubmitQuote={refreshAfterQuoteSubmission}
              onSuccess={refreshData} // Pass refresh callback to refresh page data
            />
          </ContractorProvider>
        </div>
      </main>
      
      <Toaster position="top-right" />
    </div>
  );
};

export default RequestDetail;
