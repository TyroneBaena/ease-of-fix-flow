
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
        
        // Fetch quote requests - these are requests where quotes have been requested from this contractor
        const { data: quotes, error: quotesError } = await supabase
          .from('quotes')
          .select(`
            *,
            maintenance_requests(*)
          `)
          .eq('contractor_id', contractorId)
          .in('status', ['requested', 'pending']);
          
        if (quotesError) {
          console.error('Error fetching quotes:', quotesError);
          throw quotesError;
        }
        console.log('Fetched quotes:', quotes);
        
        // Fetch jobs where quote_requested is true but no quotes exist yet for this contractor
        const { data: quoteRequestedJobs, error: quoteRequestedError } = await supabase
          .from('maintenance_requests')
          .select('*')
          .eq('quote_requested', true)
          .is('contractor_id', null);
          
        if (quoteRequestedError) {
          console.error('Error fetching quote requested jobs:', quoteRequestedError);
          throw quoteRequestedError;
        }
        console.log('Fetched quote requested jobs:', quoteRequestedJobs);
        
        // Fetch active jobs where this contractor is assigned
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
        
        // Process pending quote requests
        const pendingFromQuotes = quotes
          .filter(quote => quote.maintenance_requests)
          .map((quote: any) => mapRequestFromQuote(quote));
          
        const pendingFromRequests = quoteRequestedJobs.map(mapRequestFromDb);
        
        // Combine and deduplicate pending requests
        const allPendingRequests = [...pendingFromQuotes, ...pendingFromRequests];
        const uniquePendingRequests = allPendingRequests.filter((request, index, self) => 
          index === self.findIndex(r => r.id === request.id)
        );
        
        const activeRequests = activeJobsData.map(mapRequestFromDb);
        const completedRequests = completedJobsData.map(mapRequestFromDb);
        
        setPendingQuoteRequests(uniquePendingRequests);
        setActiveJobs(activeRequests);
        setCompletedJobs(completedRequests);
        
        console.log(`Loaded ${uniquePendingRequests.length} pending quotes, ${activeRequests.length} active jobs, ${completedRequests.length} completed jobs`);
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
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        table: 'maintenance_requests',
        filter: `quote_requested=eq.true`
      }, () => {
        console.log('Quote requested for new job, refreshing data');
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
