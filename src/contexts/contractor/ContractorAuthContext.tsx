import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserContext } from '@/contexts/UserContext';
import { MaintenanceRequest } from '@/types/maintenance';
import { toast } from '@/lib/toast';
import { mapRequestFromQuote, mapRequestFromDb } from '@/hooks/contractor/contractorDataMappers';

interface ContractorAuthContextType {
  // Auth state
  contractorId: string | null;
  isContractor: boolean;
  loading: boolean;
  error: string | null;
  
  // Data state
  pendingQuoteRequests: MaintenanceRequest[];
  activeJobs: MaintenanceRequest[];
  completedJobs: MaintenanceRequest[];
  
  // Actions
  refreshData: () => void;
}

const ContractorAuthContext = createContext<ContractorAuthContextType | undefined>(undefined);

export const useContractorAuth = () => {
  const context = useContext(ContractorAuthContext);
  if (!context) {
    throw new Error('useContractorAuth must be used within a ContractorAuthProvider');
  }
  return context;
};

export const ContractorAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading: userLoading } = useUserContext();
  
  // Auth state
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [isContractor, setIsContractor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data state
  const [pendingQuoteRequests, setPendingQuoteRequests] = useState<MaintenanceRequest[]>([]);
  const [activeJobs, setActiveJobs] = useState<MaintenanceRequest[]>([]);
  const [completedJobs, setCompletedJobs] = useState<MaintenanceRequest[]>([]);
  
  // Fetch contractor profile and data
  const fetchContractorData = async (userId: string) => {
    try {
      console.log('ContractorAuth - Fetching contractor profile for user:', userId);
      
      // Get contractor profile
      const { data: contractorData, error: contractorError } = await supabase
        .from('contractors')
        .select('id, company_name, contact_name')
        .eq('user_id', userId)
        .single();

      if (contractorError) {
        if (contractorError.code === 'PGRST116') {
          // No contractor profile found - user is not a contractor
          console.log('ContractorAuth - User is not a contractor');
          setIsContractor(false);
          setContractorId(null);
          return;
        }
        throw contractorError;
      }

      console.log('ContractorAuth - Found contractor profile:', contractorData);
      setContractorId(contractorData.id);
      setIsContractor(true);
      toast.success(`Welcome, ${contractorData.contact_name}!`);

      // Fetch contractor's jobs
      await fetchJobsData(contractorData.id);

    } catch (err: any) {
      console.error('ContractorAuth - Error fetching contractor data:', err);
      setError('Failed to load contractor profile');
      toast.error('Failed to load contractor profile');
    }
  };

  // Fetch jobs data for contractor
  const fetchJobsData = async (contractorIdParam: string) => {
    try {
      console.log('ContractorAuth - Fetching jobs for contractor:', contractorIdParam);

      // Fetch quote requests
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select(`
          *,
          maintenance_requests(*)
        `)
        .eq('contractor_id', contractorIdParam)
        .in('status', ['requested', 'pending', 'submitted']);

      if (quotesError) throw quotesError;

      // Fetch active jobs
      const { data: activeJobsData, error: activeJobsError } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('contractor_id', contractorIdParam)
        .eq('status', 'in-progress');

      if (activeJobsError) throw activeJobsError;

      // Fetch completed jobs
      const { data: completedJobsData, error: completedJobsError } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('contractor_id', contractorIdParam)
        .eq('status', 'completed');

      if (completedJobsError) throw completedJobsError;

      // Process data
      const pendingFromQuotes = quotes
        .filter(quote => quote.maintenance_requests && ['requested', 'pending', 'submitted'].includes(quote.status))
        .map((quote: any) => mapRequestFromQuote(quote));

      const activeRequests = activeJobsData.map(mapRequestFromDb);
      const completedRequests = completedJobsData.map(mapRequestFromDb);

      // Update state
      setPendingQuoteRequests(pendingFromQuotes);
      setActiveJobs(activeRequests);
      setCompletedJobs(completedRequests);

      console.log(`ContractorAuth - Loaded jobs: ${pendingFromQuotes.length} pending, ${activeRequests.length} active, ${completedRequests.length} completed`);

    } catch (err: any) {
      console.error('ContractorAuth - Error fetching jobs:', err);
      setError('Failed to load jobs data');
    }
  };

  // Initialize contractor data when user changes
  useEffect(() => {
    const initializeContractor = async () => {
      if (userLoading) {
        setLoading(true);
        return;
      }

      if (!currentUser) {
        // No user - reset all state
        setContractorId(null);
        setIsContractor(false);
        setPendingQuoteRequests([]);
        setActiveJobs([]);
        setCompletedJobs([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      await fetchContractorData(currentUser.id);
      setLoading(false);
    };

    initializeContractor();
  }, [currentUser, userLoading]);

  // Refresh data function
  const refreshData = async () => {
    if (!contractorId) return;
    
    setLoading(true);
    await fetchJobsData(contractorId);
    setLoading(false);
    toast.success('Data refreshed');
  };

  const value: ContractorAuthContextType = {
    // Auth state
    contractorId,
    isContractor,
    loading,
    error,
    
    // Data state
    pendingQuoteRequests,
    activeJobs,
    completedJobs,
    
    // Actions
    refreshData
  };

  return (
    <ContractorAuthContext.Provider value={value}>
      {children}
    </ContractorAuthContext.Provider>
  );
};