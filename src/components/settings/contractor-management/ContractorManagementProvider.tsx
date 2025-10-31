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
      
      // Add timeout protection to prevent infinite loading
      const fetchPromise = fetchContractors();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout after 10 seconds')), 10000)
      );
      
      const data = await Promise.race([fetchPromise, timeoutPromise]);
      console.log("Contractors loaded:", data.length);
      
      setContractors(data);
      setFetchedOnce(true);
      
      if (data.length === 0) {
        console.log("No contractors found in current organization");
      }
    } catch (err) {
      console.error("Error loading contractors:", err);
      const error = err instanceof Error ? err : new Error('Failed to fetch contractors');
      setFetchError(error);
      setFetchedOnce(true); // Mark as fetched even on error to prevent infinite retries
      
      // Show user-friendly error message
      if (error.message.includes('timeout')) {
        toast.error('Loading contractors timed out. Please try again.');
      } else {
        toast.error('Failed to load contractors');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Load contractors only on initial mount or when user ID changes (not on every user object update)
  useEffect(() => {
    if (currentUser && isAdmin && !fetchedOnce) {
      console.log("Initial contractor fetch for admin user");
      loadContractors();
    } else if (!currentUser || !isAdmin) {
      setLoading(false);
      setFetchedOnce(true); // Mark as done to prevent retries when not admin
    }
  }, [currentUser?.id, isAdmin, fetchedOnce, loadContractors]);

  // Listen for global tab revisit event to refresh data
  useEffect(() => {
    const handleDataRefresh = (event: CustomEvent) => {
      console.log('🔄 ContractorProvider - Received data refresh event:', event.detail);
      if (currentUser && isAdmin) {
        console.log('🔄 ContractorProvider - Refreshing contractors data after tab revisit');
        loadContractors();
      }
    };

    window.addEventListener('app-data-refresh', handleDataRefresh as EventListener);
    
    return () => {
      window.removeEventListener('app-data-refresh', handleDataRefresh as EventListener);
    };
  }, [currentUser, isAdmin, loadContractors]);

  const value: ContractorManagementContextType = useMemo(() => ({
    contractors,
    loading,
    fetchError,
    loadContractors,
    isAdmin,
    currentUser
  }), [contractors, loading, fetchError, loadContractors, isAdmin, currentUser]);

  return (
    <ContractorManagementContext.Provider value={value}>
      {children}
    </ContractorManagementContext.Provider>
  );
};