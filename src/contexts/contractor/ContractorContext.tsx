
import React, { createContext, useContext } from 'react';
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
  const contractorOperations = useContractorOperations();
  
  // Add console log to verify all required properties are present
  console.log("ContractorContext - Provider initialized with operations:", 
    Object.keys(contractorOperations));
  
  return (
    <ContractorContext.Provider value={contractorOperations}>
      {children}
    </ContractorContext.Provider>
  );
};
