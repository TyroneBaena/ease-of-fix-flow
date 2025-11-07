import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { visibilityCoordinator } from '@/utils/visibilityCoordinator';

/**
 * v68.0 - Visibility coordinator with watchdog protection
 * 
 * ARCHITECTURE CHANGE (v68.0):
 * - Added QueryClient integration for soft recovery
 * - Watchdog timer detects stuck loading states (45s threshold)
 * - Automatic recovery via cancelQueries, invalidateQueries, refetchQueries
 * 
 * PREVIOUS CHANGES:
 * v67.0 - Simplified to handler orchestration only (no session management)
 * v60.0 - Registered session ready callback (REMOVED in v67.0)
 * v56.0 - Removed duplicate callback registration from UnifiedAuthContext
 * v55.0 - Session ready callback uses ref for current values
 */

interface TabVisibilityContextType {
  coordinator: typeof visibilityCoordinator;
}

const TabVisibilityContext = createContext<TabVisibilityContextType | undefined>(undefined);

export const useTabVisibility = () => {
  const context = useContext(TabVisibilityContext);
  if (!context) {
    throw new Error('useTabVisibility must be used within a TabVisibilityProvider');
  }
  return context;
};

interface TabVisibilityProviderProps {
  children: ReactNode;
}

export const TabVisibilityProvider: React.FC<TabVisibilityProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('🔄 v68.0 - Starting visibility coordinator with watchdog protection');
    
    // v68.0: Register QueryClient for soft recovery
    visibilityCoordinator.setQueryClient(queryClient);
    
    // Start listening for visibility changes
    visibilityCoordinator.startListening();

    return () => {
      console.log('🔄 v68.0 - Stopping visibility coordinator');
      visibilityCoordinator.stopListening();
    };
  }, [queryClient]);

  return (
    <TabVisibilityContext.Provider value={{ coordinator: visibilityCoordinator }}>
      {children}
    </TabVisibilityContext.Provider>
  );
};
