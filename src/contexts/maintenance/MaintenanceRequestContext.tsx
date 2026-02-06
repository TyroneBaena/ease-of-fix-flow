import React, { createContext, useContext } from 'react';
import { MaintenanceRequestContextType } from './MaintenanceRequestTypes';
import { useMaintenanceRequestProvider } from './useMaintenanceRequestProvider';
import { MaintenanceRequest } from '@/types/maintenance';

const MaintenanceRequestContext = createContext<MaintenanceRequestContextType | undefined>(undefined);

export const useMaintenanceRequestContext = () => {
  const context = useContext(MaintenanceRequestContext);
  if (!context) {
    throw new Error('useMaintenanceRequestContext must be used within a MaintenanceRequestProvider');
  }
  return context;
};

export const MaintenanceRequestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  let value;
  try {
    value = useMaintenanceRequestProvider();
  } catch (error) {
    console.error('MaintenanceRequestProvider hook failed:', error);
    // Return a fallback provider with empty data
    return (
      <MaintenanceRequestContext.Provider value={{
        requests: [],
        loading: false,
        getRequestsForProperty: () => [],
        addRequestToProperty: async () => undefined,
        fetchRequests: async () => [],
        refreshRequests: async () => {}
      }}>
        {children}
      </MaintenanceRequestContext.Provider>
    );
  }

  // CRITICAL: Use React.useMemo to prevent unnecessary re-renders
  const typedValue: MaintenanceRequestContextType = React.useMemo(() => {
    return {
      requests: value.requests as MaintenanceRequest[],
      loading: value.loading,
      getRequestsForProperty: value.getRequestsForProperty as (propertyId: string) => MaintenanceRequest[],
      addRequestToProperty: value.addRequestToProperty,
      fetchRequests: value.loadRequests,
      refreshRequests: async () => { 
        // Pass the current sessionVersion to loadRequests
        await value.loadRequests(value.sessionVersion); 
      }
    };
  }, [value.requests, value.loading, value.getRequestsForProperty, value.addRequestToProperty, value.loadRequests, value.sessionVersion]);

  return (
    <MaintenanceRequestContext.Provider value={typedValue}>
      {children}
    </MaintenanceRequestContext.Provider>
  );
};
