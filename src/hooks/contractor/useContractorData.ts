
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
        
        console.log('Fetching contractor data for contractor ID:', contractorId);
        
        // Fetch quote requests specifically for this contractor - ONLY 'requested' status
        // These are quotes that the contractor needs to submit
        const { data: quotes, error: quotesError } = await supabase
          .from('quotes')
          .select(`
            *,
            maintenance_requests(*)
          `)
          .eq('contractor_id', contractorId)
          .eq('status', 'requested'); // ONLY requested quotes
          
        if (quotesError) {
          console.error('Error fetching quotes:', quotesError);
          throw quotesError;
        }
        console.log('Fetched requested quotes for contractor:', quotes);
        
        // Fetch active jobs assigned to this contractor (in-progress with approved quotes)
        const { data: activeJobsData, error: activeJobsError } = await supabase
          .from('maintenance_requests')
          .select('*')
          .eq('contractor_id', contractorId)
          .eq('status', 'in-progress');
          
        if (activeJobsError) {
          console.error('Error fetching active jobs:', activeJobsError);
          throw activeJobsError;
        }
        console.log('Fetched active jobs:', activeJobsData);
        
        // Fetch completed jobs
        const { data: completedJobsData, error: completedJobsError } = await supabase
          .from('maintenance_requests')
          .select('*')
          .eq('contractor_id', contractorId)
          .eq('status', 'completed');
          
        if (completedJobsError) {
          console.error('Error fetching completed jobs:', completedJobsError);
          throw completedJobsError;
        }
        console.log('Fetched completed jobs:', completedJobsData);
        
        // Process pending quote requests - only show quotes with 'requested' status
        const pendingFromQuotes = quotes
          .filter(quote => quote.maintenance_requests && quote.status === 'requested')
          .map((quote: any) => mapRequestFromQuote(quote));
        
        const activeRequests = activeJobsData.map(mapRequestFromDb);
        const completedRequests = completedJobsData.map(mapRequestFromDb);
        
        setPendingQuoteRequests(pendingFromQuotes);
        setActiveJobs(activeRequests);
        setCompletedJobs(completedRequests);
        
        console.log(`Successfully loaded contractor data: ${pendingFromQuotes.length} pending quotes, ${activeRequests.length} active jobs, ${completedRequests.length} completed jobs`);
        
        // Show success message if we have data
        if (pendingFromQuotes.length > 0 || activeRequests.length > 0 || completedRequests.length > 0) {
          toast.success('Contractor data loaded successfully');
        }
        
      } catch (error) {
        console.error('Error fetching contractor data:', error);
        setError('Failed to load contractor dashboard data');
        toast.error('Could not load job data. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchContractorData();
    
    // Set up real-time subscription for any updates to quotes and maintenance requests
    const channel = supabase
      .channel('contractor-data-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        table: 'maintenance_requests'
      }, () => {
        console.log('Maintenance request updated, refreshing data');
        fetchContractorData();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        table: 'quotes'
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
      setRefreshTrigger(prev => prev + 1);
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
