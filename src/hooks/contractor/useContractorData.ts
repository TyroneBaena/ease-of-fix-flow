
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
    console.log('🚨 useContractorData - useEffect TRIGGERED');
    console.log('🚨 useContractorData - contractorId:', contractorId);
    console.log('🚨 useContractorData - contractorId type:', typeof contractorId);
    console.log('🚨 useContractorData - loading:', loading);
    console.log('🚨 useContractorData - refreshTrigger:', refreshTrigger);
    
    if (!contractorId) {
      console.log('🚨 useContractorData - No contractor ID, clearing data');
      setPendingQuoteRequests([]);
      setActiveJobs([]);
      setCompletedJobs([]);
      hasInitializedRef.current = false;
      return;
    }
    
    console.log('useContractorData - Starting fetch for contractor ID:', contractorId);
    
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
        console.log('🔍 useContractorData - Fetching quotes for contractor:', contractorId);
        
        const { data: quotes, error: quotesError } = await supabase
          .from('quotes')
          .select(`
            *,
            maintenance_requests!inner(*)
          `)
          .eq('contractor_id', contractorId)
          .in('status', ['requested', 'pending', 'submitted']);
          
        console.log('🔍 useContractorData - Quotes query result:');
        console.log('  - Data:', quotes);
        console.log('  - Error:', quotesError);
        console.log('  - Count:', quotes?.length || 0);
        quotes?.forEach((quote, index) => {
          console.log(`  - Quote ${index}:`, {
            quoteId: quote.id,
            quoteStatus: quote.status,
            requestId: quote.maintenance_requests?.id,
            requestStatus: quote.maintenance_requests?.status,
            requestContractorId: quote.maintenance_requests?.contractor_id,
            isAssignedToThisContractor: quote.maintenance_requests?.contractor_id === contractorId
          });
        });
          
        if (quotesError) {
          console.error('🔍 useContractorData - Error fetching quotes:', quotesError);
          throw quotesError;
        }
        
        // Fetch active jobs assigned to this contractor
        // Jobs assigned to contractor should be active regardless of status (requested, in-progress)
        console.log('🔍 useContractorData - Fetching active jobs for contractor:', contractorId);
        console.log('🔍 useContractorData - Query parameters: contractor_id =', contractorId, 'status IN', ['requested', 'in-progress']);
        
        const { data: activeJobsData, error: activeJobsError } = await supabase
          .from('maintenance_requests')
          .select('*')
          .eq('contractor_id', contractorId)
          .in('status', ['requested', 'in-progress']);
          
        console.log('🔍 useContractorData - Active jobs query result:');
        console.log('  - Data:', activeJobsData);
        console.log('  - Error:', activeJobsError);
        console.log('  - Count:', activeJobsData?.length || 0);
          
        if (activeJobsError) {
          console.error('🔍 useContractorData - Error fetching active jobs:', activeJobsError);
          throw activeJobsError;
        }
        
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
        
        // FIXED: Separate quotes based on whether the REQUEST has a contractor assigned specifically to THIS contractor
        // Quotes should only show for unassigned requests OR requests assigned to other contractors
        const quotesForThisContractor = quotes.filter(quote => 
          quote.maintenance_requests && 
          quote.maintenance_requests.contractor_id === contractorId
        );
        const quotesForUnassignedRequests = quotes.filter(quote => 
          quote.maintenance_requests && 
          quote.maintenance_requests.contractor_id === null
        );
        
        console.log('🔍 useContractorData - ALL quotes received:', quotes?.length || 0);
        quotes?.forEach(quote => {
          console.log(`🔍 Quote ${quote.id?.substring(0, 8)}: request ${quote.maintenance_requests?.id?.substring(0, 8)} has contractor_id: ${quote.maintenance_requests?.contractor_id?.substring(0, 8) || 'NULL'}, this contractor: ${contractorId?.substring(0, 8)}`);
        });
        
        console.log('🔍 useContractorData - Quotes for requests assigned to THIS contractor:', quotesForThisContractor.length);
        console.log('🔍 useContractorData - Quotes for unassigned requests:', quotesForUnassignedRequests.length);
        
        // Process pending quote requests - only those with NO contractor assigned
        // Requests assigned to this contractor should NOT appear in quote requests
        const pendingFromQuotes = quotesForUnassignedRequests
          .filter(quote => ['requested', 'pending', 'submitted'].includes(quote.status))
          .map((quote: any) => mapRequestFromQuote(quote));
        
        console.log('🔍 useContractorData - Pending quote requests (no contractor assigned):', pendingFromQuotes.length);
        
        // Active jobs come ONLY from maintenance_requests table where contractor_id matches this contractor
        // This ensures that assigned jobs don't appear in quote requests
        const activeRequests = activeJobsData?.map(mapRequestFromDb) || [];
        const completedRequests = completedJobsData?.map(mapRequestFromDb) || [];
        
        console.log('🔍 useContractorData - Active jobs raw data:', activeJobsData);
        console.log('🔍 useContractorData - Active jobs mapped:', activeRequests);
        console.log('🔍 useContractorData - Completed jobs mapped:', completedRequests);
        
        // Update state only if we have a valid response
        console.log('🔥 CRITICAL DEBUG - Final data before setState:');
        console.log('🔥 pendingFromQuotes (should be unassigned only):', pendingFromQuotes.map(r => ({
          id: r.id?.substring(0, 8),
          title: r.title,
          status: r.status,
          contractorId: r.contractorId,
          isAssigned: !!r.contractorId
        })));
        console.log('🔥 activeRequests (should be assigned to this contractor):', activeRequests.map(r => ({
          id: r.id?.substring(0, 8),
          title: r.title,
          status: r.status,
          contractorId: r.contractorId,
          isAssigned: !!r.contractorId
        })));
        
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
