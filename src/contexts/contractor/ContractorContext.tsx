
import React, { createContext, useContext, useEffect } from 'react';
import { ContractorContextType } from './ContractorContextTypes';
import { useContractorOperations } from './useContractorOperations';
import { supabase } from '@/lib/supabase';

const ContractorContext = createContext<ContractorContextType | undefined>(undefined);

export const useContractorContext = () => {
  const context = useContext(ContractorContext);
  if (!context) {
    throw new Error('useContractorContext must be used within a ContractorProvider');
  }
  return context;
};

export const ContractorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    contractors,
    loading,
    error,
    loadContractors,
    assignContractor,
    requestQuote,
    submitQuote,
    approveQuote,
    updateJobProgress,
  } = useContractorOperations();

  useEffect(() => {
    // Check if user is authenticated before loading contractors
    const checkAuthAndLoadContractors = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        loadContractors();
      } else {
        console.log("No active session, skipping contractor loading");
      }
    };
    
    checkAuthAndLoadContractors();
  }, []);

  return (
    <ContractorContext.Provider value={{
      contractors,
      loading,
      error,
      assignContractor,
      requestQuote,
      submitQuote,
      approveQuote,
      updateJobProgress,
    }}>
      {children}
    </ContractorContext.Provider>
  );
};
