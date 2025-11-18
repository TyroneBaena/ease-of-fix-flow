import React, { createContext, useContext } from 'react';
import { MaintenanceRequestContextType } from './MaintenanceRequestTypes';
import { useMaintenanceRequestProvider } from './useMaintenanceRequestProvider';
import { MaintenanceRequest } from '@/types/maintenance';

// CRITICAL v64.0 - TOP LEVEL LOG TO VERIFY FILE LOADS
console.log('🔥🔥🔥 v64.0 - MaintenanceRequestContext.tsx - FILE IS LOADING NOW!');
console.log('🔥🔥🔥 v64.0 - Time:', new Date().toISOString());
console.log('🔥🔥🔥 v64.0 - React available:', typeof React !== 'undefined');

const MaintenanceRequestContext = createContext<MaintenanceRequestContextType | undefined>(undefined);

console.log('🔥🔥🔥 v64.0 - Context created successfully');

export const useMaintenanceRequestContext = () => {
  const context = useContext(MaintenanceRequestContext);
  if (!context) {
    throw new Error('useMaintenanceRequestContext must be used within a MaintenanceRequestProvider');
  }
  return context;
};

console.log('🔥🔥🔥 v64.0 - About to define MaintenanceRequestProvider component');

export const MaintenanceRequestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('🏗️🏗️🏗️ v64.0 - MaintenanceRequestProvider COMPONENT IS RENDERING!');
  console.log('🏗️🏗️🏗️ v64.0 - Time:', new Date().toISOString());
  console.log('🏗️🏗️🏗️ v64.0 - Has children:', !!children);
  
  let value;
  try {
    console.log('🏗️🏗️🏗️ v64.0 - Calling useMaintenanceRequestProvider hook...');
    value = useMaintenanceRequestProvider();
    console.log('✅✅✅ v64.0 - Hook executed successfully!', {
      hasRequests: !!value.requests,
      requestsCount: value.requests?.length,
      loading: value.loading
    });
  } catch (error) {
    console.error('❌❌❌ v64.0 - Hook FAILED:', error);
    console.error('❌❌❌ v64.0 - Error stack:', error instanceof Error ? error.stack : 'No stack');
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
    console.log('🔄 v64.0 - Creating memoized value');
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

  console.log('✅ v64.0 - Providing context', {
    requestsCount: typedValue.requests.length,
    loading: typedValue.loading
  });

  return (
    <MaintenanceRequestContext.Provider value={typedValue}>
      {children}
    </MaintenanceRequestContext.Provider>
  );
};
