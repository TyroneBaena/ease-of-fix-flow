
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { toast } from '@/lib/toast';

export const useContractorIdentification = () => {
  const { currentUser } = useUserContext();
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // CRITICAL: Track completion and prevent concurrent fetches
  const lastFetchedUserIdRef = useRef<string | null>(null);
  const hasCompletedInitialLoadRef = useRef(false);
  const isFetchingRef = useRef(false);
  const fetchDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  console.log('useContractorIdentification - Hook initialized. CurrentUser:', currentUser?.id, 'Loading:', loading);

  useEffect(() => {
    console.log('useContractorIdentification - Effect triggered, currentUser:', currentUser?.id);
    console.log('useContractorIdentification - Full currentUser object:', currentUser);
    
    // Clear any pending debounce timers
    if (fetchDebounceTimerRef.current) {
      clearTimeout(fetchDebounceTimerRef.current);
    }
    
    if (!currentUser) {
      console.log('useContractorIdentification - No current user, clearing state');
      setContractorId(null);
      setError(null);
      setLoading(false);
      lastFetchedUserIdRef.current = null;
      hasCompletedInitialLoadRef.current = true;
      isFetchingRef.current = false;
      return;
    }
    
    // Only fetch if user ID actually changed
    if (lastFetchedUserIdRef.current === currentUser.id) {
      console.log('useContractorIdentification - User ID unchanged, skipping refetch');
      return;
    }
    
    console.log('useContractorIdentification - User ID changed, debouncing fetch');
    lastFetchedUserIdRef.current = currentUser.id;

    const fetchContractorId = async () => {
      // CRITICAL: Prevent concurrent fetches
      if (isFetchingRef.current) {
        console.log('useContractorIdentification - Fetch already in progress, skipping');
        return;
      }
      
      try {
        console.log('useContractorIdentification - fetchContractorId called');
        
        // CRITICAL: Only set loading on first fetch
        if (!hasCompletedInitialLoadRef.current) {
          setLoading(true);
        }
        setError(null);
        isFetchingRef.current = true;
        
        console.log('useContractorIdentification - Fetching contractor ID for user:', currentUser.id);
        console.log('useContractorIdentification - Current user full object:', currentUser);
        
        // First verify user authentication
        if (!currentUser.id) {
          throw new Error('User not authenticated');
        }
        
        // Query contractor profile with enhanced handling for duplicates
        console.log('useContractorIdentification - About to query contractors table with user_id:', currentUser.id);
        const { data, error, count } = await supabase
          .from('contractors')
          .select('id, company_name, contact_name', { count: 'exact' })
          .eq('user_id', currentUser.id);

        console.log('useContractorIdentification - Query result:', { data, error, count });

        if (error) {
          console.error('useContractorIdentification - Database error fetching contractor ID:', error);
          throw error;
        }
         
        if (data && data.length > 0) {
          // Handle multiple contractors by taking the first one
          const contractor = data[0];
          console.log('useContractorIdentification - Found contractor, setting ID to:', contractor.id);
          setContractorId(contractor.id);
          
          if (data.length > 1) {
            console.warn(`useContractorIdentification - Found ${data.length} contractor profiles for user ${currentUser.id}. Using the first one.`);
            toast.info(`Multiple contractor profiles found. Using: ${contractor.company_name}`);
          }
          
          console.log('useContractorIdentification - Found contractor profile:', {
            contractorId: contractor.id,
            companyName: contractor.company_name,
            contactName: contractor.contact_name,
            totalProfiles: data.length,
            userId: currentUser.id
          });
          console.log('useContractorIdentification - Setting contractor ID to:', contractor.id);
          toast.success(`Welcome, ${contractor.contact_name}! Profile loaded successfully.`);
        } else {
          console.log('useContractorIdentification - No contractor profile found for user:', currentUser.id);
          const errorMessage = 'No contractor profile found. Please contact your administrator to set up your contractor account.';
          setError(errorMessage);
          toast.error(errorMessage);
        }
      } catch (err: any) {
        console.error('useContractorIdentification - Error fetching contractor ID:', err);
        
        let errorMessage = 'Unable to load contractor profile';
        
        if (err.code === 'PGRST116' || err.code === '42501') {
          errorMessage = 'Access denied. Please ensure you have contractor permissions.';
        } else if (err.message === 'User not authenticated') {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (err.code === 'NETWORK_ERROR') {
          errorMessage = 'Network error. Please check your connection and try again.';
        }
        
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        // CRITICAL: Only reset loading on first load, keep it false after
        if (!hasCompletedInitialLoadRef.current) {
          setLoading(false);
        }
        hasCompletedInitialLoadRef.current = true;
        isFetchingRef.current = false;
      }
    };

    // CRITICAL: Debounce rapid tab switches (300ms delay)
    console.log('useContractorIdentification - Setting debounced timeout to fetch contractor data');
    fetchDebounceTimerRef.current = setTimeout(() => {
      console.log('useContractorIdentification - Debounce timeout fired, calling fetchContractorId');
      fetchContractorId();
    }, 300);

    return () => {
      console.log('useContractorIdentification - Cleanup: clearing timeout');
      if (fetchDebounceTimerRef.current) {
        clearTimeout(fetchDebounceTimerRef.current);
      }
    };
  }, [currentUser?.id]); // Only depend on user ID, not the entire user object

  return { 
    contractorId, 
    setContractorId, 
    // CRITICAL: Override loading to false after initial load completes
    loading: hasCompletedInitialLoadRef.current ? false : loading, 
    setLoading, 
    error, 
    setError 
  };
};
