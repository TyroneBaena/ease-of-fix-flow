import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { Contractor } from '@/types/contractor';
import { useSimpleAuth } from '@/contexts/UnifiedAuthContext';
import { fetchContractors } from '@/contexts/contractor/operations/contractorFetch';
import { toast } from '@/lib/toast';

interface ContractorManagementContextType {
  contractors: Contractor[];
  loading: boolean;
  fetchError: Error | null;
  loadContractors: () => Promise<void>;
  isAdmin: boolean;
  currentUser: any;
}

const ContractorManagementContext = createContext<ContractorManagementContextType | undefined>(undefined);

export const useContractorManagement = () => {
  const context = useContext(ContractorManagementContext);
  if (!context) {
    throw new Error('useContractorManagement must be used within a ContractorManagementProvider');
  }
  return context;
};

export const ContractorManagementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAdmin } = useSimpleAuth();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<Error | null>(null);
  const [fetchedOnce, setFetchedOnce] = useState(false);
  const lastFetchedUserIdRef = React.useRef<string | null>(null);
  // CRITICAL: Track if we've completed initial load to prevent loading flashes
  const hasCompletedInitialLoadRef = React.useRef(false);
  // CRITICAL: Prevent concurrent fetches during rapid tab switches
  const isFetchingRef = React.useRef(false);
  const fetchDebounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  console.log('🔧 ContractorManagement - Provider state:', {
    isAdmin,
    currentUserRole: currentUser?.role,
    hasCurrentUser: !!currentUser,
    loading,
    fetchedOnce
  });

  const loadContractors = useCallback(async () => {
    // CRITICAL: Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('🔧 ContractorManagement - Fetch already in progress, skipping');
      return;
    }
    
    try {
      // ALWAYS set loading when fetching so UI updates properly
      setLoading(true);
      setFetchError(null);
      isFetchingRef.current = true;
      console.log("Loading contractors...");
      
      try {
        const data = await fetchContractors();
        console.log("Contractors loaded:", data.length);
        
        setContractors(data);
        setFetchedOnce(true);
        
        if (data.length === 0) {
          console.log("No contractors found in current organization");
        }
      } catch (fetchErr) {
        console.error("Fetch contractors failed:", fetchErr);
        throw fetchErr;
      }
    } catch (err) {
      console.error("Error loading contractors:", err);
      const error = err instanceof Error ? err : new Error('Failed to fetch contractors');
      setFetchError(error);
      setFetchedOnce(true);
      
      if (error.message.includes('timeout') || error.message.includes('aborted')) {
        toast.error('Loading contractors timed out. Please try again.');
      } else {
        toast.error('Failed to load contractors');
      }
    } finally {
      // Always reset loading after fetch completes
      setLoading(false);
      hasCompletedInitialLoadRef.current = true;
      isFetchingRef.current = false;
    }
  }, []);

  // Load contractors on initial mount and when user changes
  // CRITICAL FIX: Only refetch if user ID actually changed
  useEffect(() => {
    console.log('🔧 ContractorManagement - useEffect triggered', {
      currentUserId: currentUser?.id,
      isAdmin,
      fetchedOnce,
      lastFetchedUserId: lastFetchedUserIdRef.current
    });
    
    // Clear any pending debounce timers
    if (fetchDebounceTimerRef.current) {
      clearTimeout(fetchDebounceTimerRef.current);
    }
    
    if (!currentUser || !isAdmin) {
      console.log('🔧 ContractorManagement - Not admin or no user, skipping');
      setLoading(false);
      setFetchedOnce(true);
      lastFetchedUserIdRef.current = null;
      hasCompletedInitialLoadRef.current = true;
      isFetchingRef.current = false;
      return;
    }
    
    // Only fetch if user ID changed OR we haven't fetched yet
    const userIdChanged = lastFetchedUserIdRef.current !== currentUser.id;
    
    if (!fetchedOnce && userIdChanged) {
      console.log("🔧 ContractorManagement - Initial contractor fetch for admin user (debounced)");
      lastFetchedUserIdRef.current = currentUser.id;
      // CRITICAL: Debounce rapid tab switches (300ms delay)
      fetchDebounceTimerRef.current = setTimeout(() => {
        loadContractors();
      }, 300);
    } else if (userIdChanged && fetchedOnce) {
      console.log("🔧 ContractorManagement - User changed, refetching (debounced)");
      lastFetchedUserIdRef.current = currentUser.id;
      // CRITICAL: Debounce rapid tab switches (300ms delay)
      fetchDebounceTimerRef.current = setTimeout(() => {
        loadContractors();
      }, 300);
    } else {
      console.log("🔧 ContractorManagement - No changes, skipping fetch");
    }
    
    return () => {
      if (fetchDebounceTimerRef.current) {
        clearTimeout(fetchDebounceTimerRef.current);
      }
    };
  }, [currentUser?.id, isAdmin, fetchedOnce, loadContractors]);

  // Tab visibility handler removed - prevents excessive loading on tab switches
  // Data will refresh naturally through normal React lifecycle when needed


  const value: ContractorManagementContextType = useMemo(() => ({
    contractors,
    loading,
    fetchError,
    loadContractors,
    isAdmin,
    currentUser
  }), [contractors, loading, fetchError, loadContractors, isAdmin, currentUser?.id]);

  return (
    <ContractorManagementContext.Provider value={value}>
      {children}
    </ContractorManagementContext.Provider>
  );
};