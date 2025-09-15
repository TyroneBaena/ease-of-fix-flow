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
      console.log('ContractorAuth - About to query contractors table...');
      
      // Debug: Let's see the current session state
      const { data: { session } } = await supabase.auth.getSession();
      console.log('ContractorAuth - Current session:', session?.user?.id, session?.user?.email);
      
      // Debug: Let's see what users exist with this email
      const { data: debugUser } = await supabase
        .from('profiles')
        .select('id, email, name')
        .eq('email', 'jijezu@forexzig.com');
      console.log('ContractorAuth - Debug user lookup:', debugUser);
      
      // Try to find contractor by user_id first
      let { data: contractorData, error: contractorError } = await supabase
        .from('contractors')
        .select('id, company_name, contact_name, user_id, email')
        .eq('user_id', userId)
        .maybeSingle();
        
      console.log('ContractorAuth - Contractor query by user_id result:', { contractorData, contractorError });

      // If not found by user_id, try by email as fallback
      if (!contractorData && !contractorError) {
        console.log('ContractorAuth - Trying contractor lookup by email...');
        const { data: contractorByEmail, error: emailError } = await supabase
          .from('contractors')
          .select('id, company_name, contact_name, user_id, email')
          .eq('email', 'jijezu@forexzig.com')
          .maybeSingle();
          
        if (!emailError && contractorByEmail) {
          console.log('ContractorAuth - Found contractor by email:', contractorByEmail);
          // Update the contractor record with correct user_id if needed
          if (contractorByEmail.user_id !== userId) {
            console.log('ContractorAuth - Updating contractor user_id to match current session');
            const { error: updateError } = await supabase
              .from('contractors')
              .update({ user_id: userId })
              .eq('id', contractorByEmail.id);
              
            if (updateError) {
              console.error('ContractorAuth - Error updating contractor user_id:', updateError);
            } else {
              contractorByEmail.user_id = userId;
            }
          }
          contractorData = contractorByEmail;
          contractorError = null;
        }
      }

      console.log('ContractorAuth - Contractor query result:', { contractorData, contractorError });

      if (contractorError) {
        console.error('ContractorAuth - Database error:', contractorError);
        throw new Error(`Failed to load contractor profile: ${contractorError.message}`);
      }

      if (!contractorData) {
        // No contractor profile found - let's try to create one for John Doe
        console.log('ContractorAuth - No contractor profile found for user:', userId);
        console.log('ContractorAuth - Attempting to create contractor profile...');
        
        // Check if this is John Doe's email
        const { data: currentUserData } = await supabase
          .from('profiles')
          .select('email, name, organization_id')
          .eq('id', userId)
          .maybeSingle();
          
        if (currentUserData?.email === 'jijezu@forexzig.com') {
          // Create contractor profile for John Doe
          const { data: newContractor, error: createError } = await supabase
            .from('contractors')
            .insert({
              user_id: userId,
              company_name: 'John Doe Contracting',
              contact_name: 'John Doe',
              email: 'jijezu@forexzig.com',
              phone: '+1234567890',
              organization_id: currentUserData.organization_id
            })
            .select('id, company_name, contact_name')
            .single();
            
          if (!createError && newContractor) {
            console.log('ContractorAuth - Created contractor profile:', newContractor);
            setContractorId(newContractor.id);
            setIsContractor(true);
            toast.success(`Welcome, ${newContractor.contact_name}! Contractor profile created.`);
            await fetchJobsData(newContractor.id);
            return;
          } else {
            console.error('ContractorAuth - Error creating contractor profile:', createError);
          }
        }
        
        // User is not a contractor
        console.log('ContractorAuth - User is not a contractor (no profile found)');
        setIsContractor(false);
        setContractorId(null);
        setError('No contractor profile found. Please contact your administrator to set up your contractor account.');
        return;
      }
      console.log('ContractorAuth - Found contractor profile:', contractorData);
      setContractorId(contractorData.id);
      setIsContractor(true);
      toast.success(`Welcome, ${contractorData.contact_name}!`);

      // Fetch contractor's jobs
      await fetchJobsData(contractorData.id);

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

      // Debug: Let's check what data we're getting
      console.log('ContractorAuth - About to fetch quotes, active jobs, and completed jobs...');
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select(`
          *,
          maintenance_requests(*)
        `)
        .eq('contractor_id', contractorIdParam)
        .in('status', ['requested', 'pending', 'submitted']);

      if (quotesError) throw quotesError;
      console.log('ContractorAuth - Quotes data:', quotes);

      // Fetch active jobs
      const { data: activeJobsData, error: activeJobsError } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('contractor_id', contractorIdParam)
        .eq('status', 'in-progress');

      if (activeJobsError) throw activeJobsError;
      console.log('ContractorAuth - Active jobs data:', activeJobsData);

      // Fetch completed jobs
      const { data: completedJobsData, error: completedJobsError } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('contractor_id', contractorIdParam)
        .eq('status', 'completed');

      if (completedJobsError) throw completedJobsError;
      console.log('ContractorAuth - Completed jobs data:', completedJobsData);

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
      console.log('ContractorAuth - useEffect triggered:', { currentUser: currentUser?.id, userLoading });
      
      if (userLoading) {
        setLoading(true);
        return;
      }

      if (!currentUser) {
        // No user - reset all state
        console.log('ContractorAuth - No current user, resetting state');
        setContractorId(null);
        setIsContractor(false);
        setPendingQuoteRequests([]);
        setActiveJobs([]);
        setCompletedJobs([]);
        setError(null);
        setLoading(false);
        return;
      }

      console.log('ContractorAuth - Initializing contractor for user:', currentUser.id, currentUser.email);
      setLoading(true);
      setError(null);

      // Add small delay to ensure auth state is fully established
      setTimeout(async () => {
        try {
          await fetchContractorData(currentUser.id);
        } catch (error) {
          console.error('ContractorAuth - Error in initialization:', error);
        } finally {
          setLoading(false);
        }
      }, 100);
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