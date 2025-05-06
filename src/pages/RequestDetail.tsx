
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
  const [forceRefresh, setForceRefresh] = useState(0);
  const [lastRefreshCallTime, setLastRefreshCallTime] = useState(0);
  const [isRefreshRequested, setIsRefreshRequested] = useState(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshLockTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshCallInProgressRef = useRef(false);
  
  // Add a refresh lock mechanism to prevent rapid repeated refreshes
  const [isRefreshLocked, setIsRefreshLocked] = useState(false);
  
  // Pass forceRefresh as a dependency to useRequestDetailData to trigger refetches
  const { request, loading, quotes, isContractor, refreshData, isRefreshing } = useRequestDetailData(id, forceRefresh);
  
  // Function to temporarily lock refreshes
  const lockRefresh = useCallback((duration: number = 15000) => {
    console.log(`RequestDetail - Locking refresh for ${duration}ms`);
    setIsRefreshLocked(true);
    
    if (refreshLockTimeoutRef.current) {
      clearTimeout(refreshLockTimeoutRef.current);
    }
    
    refreshLockTimeoutRef.current = setTimeout(() => {
      console.log("RequestDetail - Refresh lock released");
      setIsRefreshLocked(false);
      refreshLockTimeoutRef.current = null;
    }, duration) as unknown as NodeJS.Timeout;
  }, []);
  
  // Function to refresh the request data with stronger protection against loops
  const refreshRequestData = useCallback(() => {
    console.log("RequestDetail - Refreshing request data requested");
    
    // Skip if refresh is locked (prevent rapid successive actions)
    if (isRefreshLocked) {
      console.log("RequestDetail - Refresh is locked, skipping");
      return;
    }
    
    // Skip if a refresh is already in progress or requested
    if (isRefreshing || isRefreshRequested || refreshCallInProgressRef.current) {
      console.log("RequestDetail - Refresh already in progress or requested, skipping");
      return;
    }
    
    // Strong time-based debouncing - 15 second window
    const currentTime = Date.now();
    if (currentTime - lastRefreshCallTime < 15000) {
      console.log("RequestDetail - Too soon since last refresh call, debouncing");
      return;
    }
    
    // Clear any existing timeout to prevent multiple timeouts
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // Lock refreshes temporarily to prevent new attempts
    lockRefresh(15000);
    
    // Mark that we've requested a refresh and update timestamp
    setLastRefreshCallTime(currentTime);
    setIsRefreshRequested(true);
    refreshCallInProgressRef.current = true;
    
    // Use the hook's refreshData function
    if (refreshData) {
      console.log("RequestDetail - Calling refreshData once");
      refreshData().finally(() => {
        // Set a timeout to clear the refresh requested flag
        refreshTimeoutRef.current = setTimeout(() => {
          console.log("RequestDetail - Clearing refresh requested flag");
          setIsRefreshRequested(false);
          refreshCallInProgressRef.current = false;
          refreshTimeoutRef.current = null;
        }, 15000) as unknown as NodeJS.Timeout;
      });
    }
  }, [refreshData, isRefreshing, lastRefreshCallTime, isRefreshRequested, isRefreshLocked, lockRefresh]);
  
  // Clean up any timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (refreshLockTimeoutRef.current) {
        clearTimeout(refreshLockTimeoutRef.current);
      }
    };
  }, []);
  
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
