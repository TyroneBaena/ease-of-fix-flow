
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
  console.log('🏗️ MaintenanceRequestProvider - Rendering');
  
  let value;
  try {
    value = useMaintenanceRequestProvider();
    console.log('✅ MaintenanceRequestProvider - Hook executed successfully', {
      hasRequests: !!value.requests,
      loading: value.loading
    });
  } catch (error) {
    console.error('❌ MaintenanceRequestProvider - Hook failed:', error);
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
    console.log('🔄 MaintenanceRequestProvider - Creating memoized value');
    return {
      requests: value.requests as MaintenanceRequest[],
      loading: value.loading,
      getRequestsForProperty: value.getRequestsForProperty as (propertyId: string) => MaintenanceRequest[],
      addRequestToProperty: value.addRequestToProperty,
      fetchRequests: value.loadRequests,
      refreshRequests: async () => { await value.loadRequests(); }
    };
  }, [value.requests, value.loading, value.getRequestsForProperty, value.addRequestToProperty, value.loadRequests]);

  console.log('✅ MaintenanceRequestProvider - Providing context', {
    requestsCount: typedValue.requests.length,
    loading: typedValue.loading
  });

  return (
    <MaintenanceRequestContext.Provider value={typedValue}>
      {children}
    </MaintenanceRequestContext.Provider>
  );
};
