
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MaintenanceRequest } from '@/types/maintenance';
import { toast } from '@/lib/toast';
import { mapRequestFromQuote, mapRequestFromDb } from './contractorDataMappers';

export const useContractorData = (
  contractorId: string | null,
  loading: boolean,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void
) => {
  const [pendingQuoteRequests, setPendingQuoteRequests] = useState<MaintenanceRequest[]>([]);
  const [activeJobs, setActiveJobs] = useState<MaintenanceRequest[]>([]);
  const [completedJobs, setCompletedJobs] = useState<MaintenanceRequest[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const isFetchingRef = useRef(false); // Prevent concurrent fetches
  const hasInitializedRef = useRef(false); // Track initial data load

  useEffect(() => {
    if (!contractorId) {
      console.log('useContractorData - No contractor ID, clearing data');
      setPendingQuoteRequests([]);
      setActiveJobs([]);
      setCompletedJobs([]);
      hasInitializedRef.current = false;
      return;
    }
    
    console.log('🔍 DEBUG: useContractorData called with contractor ID:', contractorId, 'type:', typeof contractorId);
    
    const fetchContractorData = async () => {
      try {
        // Prevent concurrent requests
        if (isFetchingRef.current) {
          console.log('useContractorData - Already fetching, skipping request');
          return;
        }

        isFetchingRef.current = true;
        setLoading(true);
        setError(null);
        
        console.log('useContractorData - Fetching contractor data for contractor ID:', contractorId);
        
        console.log('useContractorData - Current contractor ID:', contractorId);
        console.log('useContractorData - About to fetch data for contractor ID:', contractorId);
        console.log('useContractorData - Contractor ID type:', typeof contractorId);
        
        // Fetch all quotes for this contractor to check which requests they're involved in
        const { data: quotes, error: quotesError } = await supabase
          .from('quotes')
          .select(`
            *,
            maintenance_requests!inner(*)
          `)
          .eq('contractor_id', contractorId)
          .in('status', ['requested', 'pending', 'submitted']);
          
        if (quotesError) {
          console.error('useContractorData - Error fetching quotes:', quotesError);
          throw quotesError;
        }
        console.log('useContractorData - Fetched quote requests for contractor:', quotes);
        
        // Fetch active jobs assigned to this contractor
        // Jobs assigned to contractor should be active regardless of status (requested, in-progress)
        console.log('useContractorData - Fetching active jobs for contractor:', contractorId);
        console.log('useContractorData - About to query maintenance_requests table with contractor_id:', contractorId);
        console.log('🔍 DEBUG: Query params - contractor_id:', contractorId, 'type:', typeof contractorId);
        
        const { data: activeJobsData, error: activeJobsError } = await supabase
          .from('maintenance_requests')
          .select('*')
          .eq('contractor_id', contractorId)
          .in('status', ['requested', 'in-progress']);
          
        if (activeJobsError) {
          console.error('useContractorData - Error fetching active jobs:', activeJobsError);
          throw activeJobsError;
        }
        console.log('🔍 DEBUG: Raw active jobs result:', activeJobsData);
        console.log('useContractorData - Fetched active jobs:', activeJobsData);
        console.log('useContractorData - Active jobs count:', activeJobsData?.length || 0);
        
        // Fetch completed jobs
        console.log('useContractorData - About to query maintenance_requests for completed jobs with contractor_id:', contractorId);
        const { data: completedJobsData, error: completedJobsError } = await supabase
          .from('maintenance_requests')
          .select('*')
          .eq('contractor_id', contractorId)
          .eq('status', 'completed');
          
        if (completedJobsError) {
          console.error('useContractorData - Error fetching completed jobs:', completedJobsError);
          throw completedJobsError;
        }
        console.log('useContractorData - Fetched completed jobs:', completedJobsData);
        console.log('useContractorData - Completed jobs count:', completedJobsData?.length || 0);
        
        // Separate quotes into active jobs vs quote requests based on request assignment
        const quotesWithAssignedRequests = quotes.filter(quote => 
          quote.maintenance_requests && quote.maintenance_requests.contractor_id === contractorId
        );
        const quotesWithUnassignedRequests = quotes.filter(quote => 
          quote.maintenance_requests && !quote.maintenance_requests.contractor_id
        );
        
        // Process pending quote requests - only those without contractor assignment
        const pendingFromQuotes = quotesWithUnassignedRequests
          .filter(quote => ['requested', 'pending', 'submitted'].includes(quote.status))
          .map((quote: any) => mapRequestFromQuote(quote));
        
        // Process active jobs from quotes (requests assigned to this contractor)
        const activeFromQuotes = quotesWithAssignedRequests
          .map((quote: any) => mapRequestFromQuote(quote));
        
        // Combine active jobs from maintenance_requests table and from quotes, removing duplicates
        const activeRequestsFromDb = activeJobsData.map(mapRequestFromDb);
        const activeRequestIds = new Set(activeRequestsFromDb.map(req => req.id));
        const uniqueActiveFromQuotes = activeFromQuotes.filter(req => !activeRequestIds.has(req.id));
        
        const activeRequests = [
          ...activeRequestsFromDb,
          ...uniqueActiveFromQuotes
        ];
        const completedRequests = completedJobsData.map(mapRequestFromDb);
        
        console.log('useContractorData - Mapped active requests:', activeRequests);
        console.log('useContractorData - Mapped completed requests:', completedRequests);
        
        // Update state only if we have a valid response
        setPendingQuoteRequests(pendingFromQuotes);
        setActiveJobs(activeRequests);
        setCompletedJobs(completedRequests);
        hasInitializedRef.current = true;
        
        console.log(`useContractorData - STATE UPDATED for ${contractorId}: ${pendingFromQuotes.length} pending quotes, ${activeRequests.length} active jobs, ${completedRequests.length} completed jobs`);
        console.log('useContractorData - Active jobs data:', activeRequests);
        
        // Show success message only on initial load
        if (!hasInitializedRef.current && (pendingFromQuotes.length > 0 || activeRequests.length > 0 || completedRequests.length > 0)) {
          toast.success('Contractor data loaded successfully');
        }
        
      } catch (error) {
        console.error('useContractorData - Error fetching contractor data:', error);
        setError('Failed to load contractor dashboard data');
        // Don't clear existing data on error, just show error message
        if (!hasInitializedRef.current) {
          toast.error('Could not load job data. Please try refreshing the page.');
        }
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    };
    
    // Add delay for initial load to prevent race conditions
    const timeoutId = setTimeout(() => {
      fetchContractorData();
    }, hasInitializedRef.current ? 0 : 200);

    return () => clearTimeout(timeoutId);
    
    // Set up real-time subscription only after initial load
    // This prevents rapid successive calls during initialization
    
  }, [contractorId, refreshTrigger]); // Removed setLoading and setError from dependencies

  // Separate effect for real-time subscriptions to prevent interference
  useEffect(() => {
    if (!contractorId || !hasInitializedRef.current) return;

    console.log('useContractorData - Setting up real-time subscriptions');
    
    const channel = supabase
      .channel('contractor-data-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        table: 'maintenance_requests'
      }, (payload) => {
        console.log('useContractorData - Maintenance request updated:', payload);
        // Debounce real-time updates to prevent excessive calls
        setTimeout(() => {
          if (!isFetchingRef.current) {
            setRefreshTrigger(prev => prev + 1);
          }
        }, 1000);
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        table: 'quotes'
      }, (payload) => {
        console.log('useContractorData - Quote updated:', payload);
        // Debounce real-time updates to prevent excessive calls
        setTimeout(() => {
          if (!isFetchingRef.current) {
            setRefreshTrigger(prev => prev + 1);
          }
        }, 1000);
      })
      .subscribe();
    
    return () => {
      console.log('useContractorData - Cleaning up real-time subscriptions');
      supabase.removeChannel(channel);
    };
  }, [contractorId]);

  const refreshData = () => {
    if (contractorId && !isFetchingRef.current) {
      console.log('useContractorData - Manual refresh triggered');
      setLoading(true);
      setRefreshTrigger(prev => prev + 1);
      toast.info('Refreshing data...');
    } else if (isFetchingRef.current) {
      console.log('useContractorData - Refresh skipped - already fetching');
    }
  };

  return {
    pendingQuoteRequests,
    activeJobs,
    completedJobs,
    refreshData
  };
};
