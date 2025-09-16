import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useSimpleAuth } from '@/contexts/UnifiedAuthContext';
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
  const { currentUser, loading: userLoading } = useSimpleAuth();
  
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
        console.log('ContractorAuth - Found contractor profile:', contractorByUserId.id);
        setContractorId(contractorByUserId.id);
        setIsContractor(true);
        setError(null);
        toast.success(`Welcome back, ${contractorByUserId.contact_name}!`);
        console.log('ContractorAuth - About to fetch jobs for contractor:', contractorByUserId.id);
        await fetchJobsData(contractorByUserId.id);
        console.log('ContractorAuth - Finished fetching jobs for contractor:', contractorByUserId.id);
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
        console.log('ContractorAuth - Found contractor by email, linking user_id...');
        // Link the user_id to the contractor record
        const { error: updateError } = await supabase
          .from('contractors')
          .update({ user_id: userId })
          .eq('id', contractorByEmail.id);
          
        if (updateError) {
          console.error('ContractorAuth - Error linking contractor to user:', updateError);
          throw updateError;
        }
        
        console.log('ContractorAuth - Successfully linked contractor to user');
        setContractorId(contractorByEmail.id);
        setIsContractor(true);
        setError(null);
        toast.success(`Welcome, ${contractorByEmail.contact_name}! Profile linked successfully.`);
        console.log('ContractorAuth - About to fetch jobs for linked contractor:', contractorByEmail.id);
        await fetchJobsData(contractorByEmail.id);
        console.log('ContractorAuth - Finished fetching jobs for linked contractor:', contractorByEmail.id);
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

  // SIMPLE, BULLETPROOF FETCH FUNCTION
  const fetchJobsData = useCallback(async (contractorIdParam: string) => {
    try {
      console.log('🔥 SIMPLE LOGIC - Starting fetchJobsData for contractor:', contractorIdParam?.substring(0, 8));
      setLoading(true);

      // Step 1: Get ALL requests assigned to this contractor
      console.log('🔥 STEP 1: Fetching ALL assigned requests...');
      const { data: assignedRequests, error: assignedError } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('contractor_id', contractorIdParam);

      if (assignedError) {
        console.error('🔥 Error fetching assigned requests:', assignedError);
        throw assignedError;
      }
      
      console.log('🔥 Found assigned requests:', assignedRequests?.length || 0);
      assignedRequests?.forEach(req => {
        console.log(`🔥 Assigned: ${req.id?.substring(0, 8)} - ${req.title} - Status: ${req.status}`);
      });

      // Step 2: Get quotes for UNassigned requests only
      console.log('🔥 STEP 2: Fetching quotes for UNASSIGNED requests...');
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select(`
          *,
          maintenance_requests!inner(*)
        `)
        .eq('contractor_id', contractorIdParam)
        .is('maintenance_requests.contractor_id', null); // Only unassigned requests

      if (quotesError) {
        console.error('🔥 Error fetching quotes:', quotesError);
        throw quotesError;
      }
      
      console.log('🔥 Found quotes for unassigned requests:', quotes?.length || 0);
      quotes?.forEach(quote => {
        console.log(`🔥 Quote: ${quote.id?.substring(0, 8)} for unassigned request: ${quote.maintenance_requests?.id?.substring(0, 8)}`);
      });

      // Step 3: SIMPLE categorization
      const activeJobs = assignedRequests?.filter(req => 
        req.status === 'requested' || req.status === 'in-progress'
      ) || [];
      
      const completedJobs = assignedRequests?.filter(req => 
        req.status === 'completed'
      ) || [];

      const quoteRequests = quotes?.filter(quote => 
        ['requested', 'pending', 'submitted'].includes(quote.status)
      ) || [];

      console.log('🔥 SIMPLE CATEGORIZATION RESULTS:');
      console.log(`🔥 Active Jobs (assigned with requested/in-progress): ${activeJobs.length}`);
      console.log(`🔥 Completed Jobs (assigned with completed): ${completedJobs.length}`);
      console.log(`🔥 Quote Requests (unassigned only): ${quoteRequests.length}`);

      // Step 4: Map the data
      const mappedActiveJobs = activeJobs.map(mapRequestFromDb);
      const mappedCompletedJobs = completedJobs.map(mapRequestFromDb);
      const mappedQuoteRequests = quoteRequests.map((quote: any) => mapRequestFromQuote(quote));

      // Step 5: Update state
      setPendingQuoteRequests(mappedQuoteRequests);
      setActiveJobs(mappedActiveJobs);
      setCompletedJobs(mappedCompletedJobs);

      console.log('🔥 FINAL STATE UPDATE:');
      console.log(`🔥 Quote Requests: ${mappedQuoteRequests.length}`);
      console.log(`🔥 Active Jobs: ${mappedActiveJobs.length}`);
      console.log(`🔥 Completed Jobs: ${mappedCompletedJobs.length}`);

    } catch (err: any) {
      console.error('🔥 Error in fetchJobsData:', err);
      setError('Failed to load jobs data');
    } finally {
      console.log('🔥 fetchJobsData completed');
      setLoading(false);
    }
  }, []);

  // Initialize contractor data when user changes - with proper dependency management
  useEffect(() => {
    let isCancelled = false;
    
    const initializeContractor = async () => {
      console.log('ContractorAuth - useEffect triggered:', {
        hasCurrentUser: !!currentUser,
        userId: currentUser?.id,
        userLoading,
        isCancelled
      });
      
      if (userLoading) {
        console.log('ContractorAuth - User still loading, waiting...');
        return;
      }
      
      if (!currentUser?.id) {
        console.log('ContractorAuth - No current user, resetting contractor state');
        if (!isCancelled) {
          setIsContractor(false);
          setContractorId(null);
          setError(null);
          setLoading(false);
          setPendingQuoteRequests([]);
          setActiveJobs([]);
          setCompletedJobs([]);
        }
        return;
      }
      
      console.log('ContractorAuth - Initializing contractor for user:', currentUser.id);
      
      if (!isCancelled) {
        setLoading(true);
        setError(null);
        await fetchContractorData(currentUser.id);
      }
    };
    
    initializeContractor();
    
    return () => {
      console.log('ContractorAuth - Cleanup: cancelling ongoing requests');
      isCancelled = true;
    };
  }, [currentUser?.id, userLoading]); // Only depend on stable values

  // Refresh data function with useCallback to prevent infinite re-renders
  const refreshData = useCallback(async () => {
    if (!contractorId) return;
    
    setLoading(true);
    await fetchJobsData(contractorId);
    setLoading(false);
    toast.success('Data refreshed');
  }, [contractorId, fetchJobsData]);

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