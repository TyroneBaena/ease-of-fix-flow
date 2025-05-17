
import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!contractorId) return;
    
    const fetchContractorData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching quote requests for contractor:', contractorId);
        // Fetch quote requests
        const { data: quotes, error: quotesError } = await supabase
          .from('quotes')
          .select('*, maintenance_requests(*)')
          .eq('contractor_id', contractorId)
          .eq('status', 'requested');
          
        if (quotesError) throw quotesError;
        console.log('Fetched quotes:', quotes);
        
        // Fetch active jobs where this contractor is assigned
        console.log('Fetching active jobs for contractor:', contractorId);
        const { data: activeJobsData, error: activeJobsError } = await supabase
          .from('maintenance_requests')
          .select('*')
          .eq('contractor_id', contractorId)
          .eq('status', 'in-progress');
          
        if (activeJobsError) throw activeJobsError;
        console.log('Fetched active jobs:', activeJobsData);
        
        // Fetch completed jobs
        console.log('Fetching completed jobs for contractor:', contractorId);
        const { data: completedJobsData, error: completedJobsError } = await supabase
          .from('maintenance_requests')
          .select('*')
          .eq('contractor_id', contractorId)
          .eq('status', 'completed');
          
        if (completedJobsError) throw completedJobsError;
        console.log('Fetched completed jobs:', completedJobsData);
        
        // Map the requests from the quotes to MaintenanceRequest type
        const pendingRequests = quotes.map((quote: any) => mapRequestFromQuote(quote));
        const activeRequests = activeJobsData.map(mapRequestFromDb);
        const completedRequests = completedJobsData.map(mapRequestFromDb);
        
        setPendingQuoteRequests(pendingRequests);
        setActiveJobs(activeRequests);
        setCompletedJobs(completedRequests);
        
        console.log(`Loaded ${pendingRequests.length} pending quotes, ${activeRequests.length} active jobs, ${completedRequests.length} completed jobs`);
      } catch (error) {
        console.error('Error fetching contractor data:', error);
        setError('Failed to load contractor dashboard data');
        toast.error('Could not load job data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchContractorData();
    
    // Set up real-time subscription for any updates
    const channel = supabase
      .channel('contractor-data-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        table: 'maintenance_requests',
        filter: `contractor_id=eq.${contractorId}`
      }, () => {
        console.log('Maintenance request updated, refreshing data');
        fetchContractorData();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        table: 'quotes',
        filter: `contractor_id=eq.${contractorId}`
      }, () => {
        console.log('Quote updated, refreshing data');
        fetchContractorData();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [contractorId, refreshTrigger, setLoading, setError]);

  const refreshData = () => {
    if (contractorId) {
      setLoading(true);
      setRefreshTrigger(prev => prev + 1); // This will trigger the useEffect to run again
      toast.info('Refreshing data...');
    }
  };

  return {
    pendingQuoteRequests,
    activeJobs,
    completedJobs,
    refreshData
  };
};
