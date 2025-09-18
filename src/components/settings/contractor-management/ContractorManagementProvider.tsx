import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Contractor } from '@/types/contractor';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
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

  console.log('🔧 ContractorManagement - Provider state:', {
    isAdmin,
    currentUserRole: currentUser?.role,
    hasCurrentUser: !!currentUser,
    loading
  });

  const loadContractors = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      console.log("Loading contractors...");
      
      const data = await fetchContractors();
      console.log("Contractors loaded:", data.length);
      
      setContractors(data);
      
      if (data.length === 0) {
        console.log("No contractors found in current organization");
      }
    } catch (err) {
      console.error("Error loading contractors:", err);
      setFetchError(err instanceof Error ? err : new Error('Failed to fetch contractors'));
      toast.error('Failed to load contractors');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load contractors when component mounts or user changes
  useEffect(() => {
    if (currentUser && isAdmin) {
      loadContractors();
    } else {
      setLoading(false);
    }
  }, [currentUser, isAdmin, loadContractors]);

  const value: ContractorManagementContextType = {
    contractors,
    loading,
    fetchError,
    loadContractors,
    isAdmin,
    currentUser
  };

  return (
    <ContractorManagementContext.Provider value={value}>
      {children}
    </ContractorManagementContext.Provider>
  );
};