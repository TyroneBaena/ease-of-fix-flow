import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
      
      // Debug: Check if we have an active session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('ContractorAuth - Session check:', {
        hasSession: !!session,
        sessionUserId: session?.user?.id,
        sessionEmail: session?.user?.email,
        paramUserId: userId,
        sessionError
      });
      
      // If no session, force re-authentication
      if (!session || !session.user) {
        console.error('ContractorAuth - No active session found!');
        setIsContractor(false);
        setContractorId(null);
        setError('Authentication session expired. Please log in again.');
        return;
      }
      
      // Verify the session user matches the param
      if (session.user.id !== userId) {
        console.error('ContractorAuth - Session user ID mismatch:', {
          sessionUserId: session.user.id,
          paramUserId: userId
        });
        setIsContractor(false);
        setContractorId(null);
        setError('Session user ID mismatch. Please log in again.');
        return;
      }
      
      // Get current user's profile info for email lookup
      const { data: currentUserProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, name, organization_id')
        .eq('id', userId)
        .maybeSingle();
      
      console.log('ContractorAuth - Current user profile:', { currentUserProfile, profileError });
      
      if (profileError) {
        console.error('ContractorAuth - Error fetching user profile:', profileError);
        throw profileError;
      }
      
      if (!currentUserProfile) {
        console.error('ContractorAuth - No profile found for user:', userId);
        setIsContractor(false);
        setContractorId(null);
        setError('User profile not found. Please contact administrator.');
        return;
      }
      
      // Try to find contractor by user_id first
      const { data: contractorByUserId, error: userIdError } = await supabase
        .from('contractors')
        .select('id, company_name, contact_name, user_id, email, organization_id')
        .eq('user_id', userId)
        .maybeSingle();
        
      console.log('ContractorAuth - Contractor query by user_id result:', { contractorByUserId, userIdError });

      if (userIdError && userIdError.code !== 'PGRST116') {
        console.error('ContractorAuth - Database error in user_id query:', userIdError);
        throw userIdError;
      }
      
      if (contractorByUserId) {
        console.log('ContractorAuth - Found contractor by user_id:', contractorByUserId.id);
        setContractorId(contractorByUserId.id);
        setIsContractor(true);
        setError(null);
        toast.success(`Welcome back, ${contractorByUserId.contact_name}!`);
        await fetchJobsData(contractorByUserId.id);
        return;
      }

      // If not found by user_id, try by email as fallback
      console.log('ContractorAuth - Trying contractor lookup by email:', currentUserProfile.email);
      const { data: contractorByEmail, error: emailError } = await supabase
        .from('contractors')
        .select('id, company_name, contact_name, user_id, email, organization_id')
        .eq('email', currentUserProfile.email)
        .maybeSingle();
        
      console.log('ContractorAuth - Contractor query by email result:', { contractorByEmail, emailError });
        
      if (emailError && emailError.code !== 'PGRST116') {
        console.error('ContractorAuth - Database error in email query:', emailError);
        throw emailError;
      }
      
      if (contractorByEmail) {
        console.log('ContractorAuth - Found contractor by email, linking to current user');
        
        // Update the contractor record with correct user_id
        const { error: updateError } = await supabase
          .from('contractors')
          .update({ user_id: userId })
          .eq('id', contractorByEmail.id);
          
        if (updateError) {
          console.error('ContractorAuth - Error updating contractor user_id:', updateError);
          throw updateError;
        }
        
        console.log('ContractorAuth - Successfully linked contractor to user');
        setContractorId(contractorByEmail.id);
        setIsContractor(true);
        setError(null);
        toast.success(`Welcome, ${contractorByEmail.contact_name}! Profile linked successfully.`);
        await fetchJobsData(contractorByEmail.id);
        return;
      }
      
      // No contractor profile found
      console.log('ContractorAuth - No contractor profile found for user:', userId, 'email:', currentUserProfile.email);
      setIsContractor(false);
      setContractorId(null);
      setError('No contractor profile found. Please contact your administrator to set up your contractor account.');

    } catch (err: any) {
      console.error('ContractorAuth - Error fetching contractor data:', err);
      setIsContractor(false);
      setContractorId(null);
      setError(err.message || 'Failed to load contractor profile');
      toast.error('Failed to load contractor profile');
    }
  };

  // Fetch jobs data for contractor
  const fetchJobsData = async (contractorIdParam: string) => {
    try {
      console.log('ContractorAuth - Fetching jobs for contractor:', contractorIdParam);

      // Fetch quotes (pending requests needing quotes)
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

      // Fetch ALL jobs assigned to this contractor (regardless of status)
      const { data: allJobs, error: allJobsError } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('contractor_id', contractorIdParam);

      if (allJobsError) throw allJobsError;
      console.log('ContractorAuth - All assigned jobs:', allJobs);

      // Separate jobs by status
      const activeJobsData = allJobs.filter(job => job.status === 'in_progress');
      const completedJobsData = allJobs.filter(job => job.status === 'completed');
      
      console.log('ContractorAuth - Active jobs:', activeJobsData);
      console.log('ContractorAuth - Completed jobs:', completedJobsData);

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

      console.log(`ContractorAuth - Final counts: ${pendingFromQuotes.length} pending quotes, ${activeRequests.length} active jobs, ${completedRequests.length} completed jobs`);

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

  // Refresh data function with useCallback to prevent infinite re-renders
  const refreshData = useCallback(async () => {
    if (!contractorId) return;
    
    setLoading(true);
    await fetchJobsData(contractorId);
    setLoading(false);
    toast.success('Data refreshed');
  }, [contractorId]);

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