
import React, { createContext, useContext, ReactNode } from 'react';
import { Property } from '@/types/property';
import { usePropertyProvider } from './usePropertyProvider';
import { PropertyContextType } from './PropertyContextTypes';

// Create the context with undefined as default value
const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const propertyContextValue = usePropertyProvider();

  return (
    <PropertyContext.Provider value={propertyContextValue}>
      {children}
    </PropertyContext.Provider>
  );
};

export const usePropertyContext = () => {
  const context = useContext(PropertyContext);
  if (!context) {
    throw new Error('usePropertyContext must be used within a PropertyProvider');
  }
  return context;
};
