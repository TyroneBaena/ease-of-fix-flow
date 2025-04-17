
import React, { createContext, useContext } from 'react';
import { ContractorContextType } from './ContractorContextTypes';
import { useContractorProvider } from './useContractorProvider';

const ContractorContext = createContext<ContractorContextType | undefined>(undefined);

export const useContractorContext = () => {
  const context = useContext(ContractorContext);
  if (!context) {
    throw new Error('useContractorContext must be used within a ContractorProvider');
  }
  return context;
};

export const ContractorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const contractorState = useContractorProvider();

  return (
    <ContractorContext.Provider value={contractorState}>
      {children}
    </ContractorContext.Provider>
  );
};

