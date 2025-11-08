import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { visibilityCoordinator } from '@/utils/visibilityCoordinator';

/**
 * v77.0 - Component loading states now subscribe to instant reset
 * 
 * CRITICAL FIX (v77.0):
 * - Data providers now subscribe to `onTabRefreshChange` callback
 * - Component loading states are instantly reset on tab return
 * - Eliminates "Loading..." UI on tab revisit
 * 
 * PREVIOUS FIXES:
 * v76.0 - Handler timeouts properly cleared
 * v75.0 - INSTANT loading reset on tab return
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
    console.log('🔄 v79.0 - Starting visibility coordinator (passive mode)');
    
    // v79.0: Just start listening - no setup needed
    visibilityCoordinator.startListening();

    return () => {
      console.log('🔄 v79.0 - Stopping visibility coordinator');
      visibilityCoordinator.stopListening();
    };
  }, [queryClient]);

  return (
    <TabVisibilityContext.Provider value={{ coordinator: visibilityCoordinator }}>
      {children}
    </TabVisibilityContext.Provider>
  );
};
