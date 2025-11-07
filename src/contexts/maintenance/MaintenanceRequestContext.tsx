
import React, { createContext, useContext } from 'react';
import { MaintenanceRequestContextType } from './MaintenanceRequestTypes';
import { useMaintenanceRequestProvider } from './useMaintenanceRequestProvider';
import { MaintenanceRequest } from '@/types/maintenance';

console.log('📦 v63.0 - MaintenanceRequestContext.tsx - FILE IMPORTED/LOADED AT:', new Date().toISOString());

const MaintenanceRequestContext = createContext<MaintenanceRequestContextType | undefined>(undefined);

export const useMaintenanceRequestContext = () => {
  const context = useContext(MaintenanceRequestContext);
  if (!context) {
    throw new Error('useMaintenanceRequestContext must be used within a MaintenanceRequestProvider');
  }
  return context;
};

console.log('📦 v63.0 - MaintenanceRequestContext.tsx - FILE LOADED');

export const MaintenanceRequestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('🏗️ v63.0 - MaintenanceRequestProvider - COMPONENT RENDERING START AT:', new Date().toISOString());
  console.log('🏗️ v63.0 - MaintenanceRequestProvider - children:', !!children);
  
  let value;
  try {
    console.log('🏗️ v62.0 - MaintenanceRequestProvider - About to call useMaintenanceRequestProvider()');
    value = useMaintenanceRequestProvider();
    console.log('✅ v62.0 - MaintenanceRequestProvider - Hook executed successfully', {
      hasRequests: !!value.requests,
      requestsCount: value.requests?.length,
      loading: value.loading
    });
  } catch (error) {
    console.error('❌ v62.0 - MaintenanceRequestProvider - Hook failed:', error);
    console.error('❌ v62.0 - MaintenanceRequestProvider - Error stack:', error instanceof Error ? error.stack : 'No stack');
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
