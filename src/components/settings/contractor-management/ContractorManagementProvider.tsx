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

  console.log('🔧 ContractorManagement - Provider state:', {
    isAdmin,
    currentUserRole: currentUser?.role,
    hasCurrentUser: !!currentUser,
    loading,
    fetchedOnce
  });

  const loadContractors = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      console.log("Loading contractors...");
      
      // Timeout protection with abort controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const data = await fetchContractors();
        clearTimeout(timeoutId);
        
        console.log("Contractors loaded:", data.length);
        
        setContractors(data);
        setFetchedOnce(true);
        
        if (data.length === 0) {
          console.log("No contractors found in current organization");
        }
      } catch (fetchErr) {
        clearTimeout(timeoutId);
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
      setLoading(false);
      hasCompletedInitialLoadRef.current = true;
    }
  }, [currentUser, isAdmin]);

  // Load contractors on initial mount and when user changes
  // CRITICAL FIX: Only refetch if user ID actually changed
  useEffect(() => {
    console.log('🔧 ContractorManagement - useEffect triggered', {
      currentUserId: currentUser?.id,
      isAdmin,
      fetchedOnce,
      lastFetchedUserId: lastFetchedUserIdRef.current
    });
    
    if (!currentUser || !isAdmin) {
      console.log('🔧 ContractorManagement - Not admin or no user, skipping');
      setLoading(false);
      setFetchedOnce(true);
      lastFetchedUserIdRef.current = null;
      hasCompletedInitialLoadRef.current = true; // Mark as complete even if not admin
      return;
    }
    
    // Only fetch if user ID changed OR we haven't fetched yet
    const userIdChanged = lastFetchedUserIdRef.current !== currentUser.id;
    
    if (!fetchedOnce && userIdChanged) {
      console.log("🔧 ContractorManagement - Initial contractor fetch for admin user");
      lastFetchedUserIdRef.current = currentUser.id;
      loadContractors();
    } else if (userIdChanged && fetchedOnce) {
      console.log("🔧 ContractorManagement - User changed, refetching");
      lastFetchedUserIdRef.current = currentUser.id;
      loadContractors();
    } else {
      console.log("🔧 ContractorManagement - No changes, skipping fetch");
    }
  }, [currentUser?.id, isAdmin, fetchedOnce, loadContractors]);

  // Tab visibility handler removed - prevents excessive loading on tab switches
  // Data will refresh naturally through normal React lifecycle when needed


  const value: ContractorManagementContextType = useMemo(() => ({
    contractors,
    // CRITICAL: Override loading to false after initial load completes
    // This prevents loading flashes on tab switches
    loading: hasCompletedInitialLoadRef.current ? false : loading,
    fetchError,
    loadContractors,
    isAdmin,
    currentUser
  }), [contractors, loading, fetchError, loadContractors, isAdmin, currentUser?.id]); // Use ID to prevent re-render on object recreation

  return (
    <ContractorManagementContext.Provider value={value}>
      {children}
    </ContractorManagementContext.Provider>
  );
};