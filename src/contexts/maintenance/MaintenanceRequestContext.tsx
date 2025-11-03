
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
  const value = useMaintenanceRequestProvider();

  // Log provider re-renders for debugging
  React.useEffect(() => {
    console.log('🔄 MaintenanceRequestProvider - Re-rendered with requests:', value.requests.length);
  }, [value.requests.length]);

  // CRITICAL: Use React.useMemo to prevent unnecessary re-renders
  const typedValue: MaintenanceRequestContextType = React.useMemo(() => ({
    requests: value.requests as MaintenanceRequest[],
    loading: value.loading,
    getRequestsForProperty: value.getRequestsForProperty as (propertyId: string) => MaintenanceRequest[],
    addRequestToProperty: value.addRequestToProperty,
    fetchRequests: value.loadRequests,
    refreshRequests: async () => { await value.loadRequests(); }
  }), [value.requests, value.loading, value.getRequestsForProperty, value.addRequestToProperty, value.loadRequests]);

  return (
    <MaintenanceRequestContext.Provider value={typedValue}>
      {children}
    </MaintenanceRequestContext.Provider>
  );
};
