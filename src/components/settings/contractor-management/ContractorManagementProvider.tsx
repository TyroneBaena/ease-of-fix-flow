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
      // CRITICAL: Always reset loading state
      setLoading(false);
    }
  }, []);

  // Load contractors on initial mount and when tab becomes visible
  useEffect(() => {
    if (currentUser && isAdmin && !fetchedOnce) {
      console.log("Initial contractor fetch for admin user");
      loadContractors();
    } else if (!currentUser || !isAdmin) {
      setLoading(false);
      setFetchedOnce(true);
    }
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
  }), [contractors, loading, fetchError, loadContractors, isAdmin, currentUser]);

  return (
    <ContractorManagementContext.Provider value={value}>
      {children}
    </ContractorManagementContext.Provider>
  );
};