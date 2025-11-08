import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { visibilityCoordinator } from '@/utils/visibilityCoordinator';

/**
 * v76.0 - Fixed handler timeout cleanup
 * 
 * CRITICAL FIX (v76.0):
 * - Handler timeouts are now properly cleared when handlers complete
 * - Eliminates ghost "Handler timeout" errors after successful completion
 * - Recovery flag pauses health monitor during tab return refresh
 * 
 * PREVIOUS CHANGES:
 * v75.0 - INSTANT loading reset on tab return + background refresh
 * v68.0 - Added QueryClient integration for soft recovery
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
    console.log('🔄 v76.0 - Starting visibility coordinator with timeout cleanup');
    
    // v76.0: Register QueryClient for instant reset + background refresh
    visibilityCoordinator.setQueryClient(queryClient);
    
    // Start listening for visibility changes
    visibilityCoordinator.startListening();

    return () => {
      console.log('🔄 v76.0 - Stopping visibility coordinator');
      visibilityCoordinator.stopListening();
    };
  }, [queryClient]);

  return (
    <TabVisibilityContext.Provider value={{ coordinator: visibilityCoordinator }}>
      {children}
    </TabVisibilityContext.Provider>
  );
};
