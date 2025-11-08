import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { visibilityCoordinator } from '@/utils/visibilityCoordinator';

/**
 * v75.0 - INSTANT loading reset on tab return + background refresh
 * 
 * CRITICAL CHANGE (v75.0):
 * - On tab return, loading states reset INSTANTLY (synchronous)
 * - Then background refresh happens silently (no loading indicators)
 * - Eliminates ALL loading flashes on tab revisit
 * 
 * PREVIOUS CHANGES:
 * v68.0 - Added QueryClient integration for soft recovery
 * v67.0 - Simplified to handler orchestration only (no session management)
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
    console.log('🔄 v75.0 - Starting visibility coordinator with INSTANT reset');
    
    // v75.0: Register QueryClient for instant reset + background refresh
    visibilityCoordinator.setQueryClient(queryClient);
    
    // Start listening for visibility changes
    visibilityCoordinator.startListening();

    return () => {
      console.log('🔄 v75.0 - Stopping visibility coordinator');
      visibilityCoordinator.stopListening();
    };
  }, [queryClient]);

  return (
    <TabVisibilityContext.Provider value={{ coordinator: visibilityCoordinator }}>
      {children}
    </TabVisibilityContext.Provider>
  );
};
