
import React, { createContext, useContext, useEffect } from 'react';
import { ContractorContextType } from './ContractorContextTypes';
import { useContractorOperations } from './useContractorOperations';

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
    loadContractors();
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

