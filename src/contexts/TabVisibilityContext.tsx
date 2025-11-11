import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { visibilityCoordinator } from '@/utils/visibilityCoordinator';

/**
 * v79.1 - Minimal flag reset on tab return
 * 
 * CURRENT FIX (v79.1):
 * - Visibility coordinator supports reset callbacks
 * - Components can register callbacks to reset stuck flags
 * - Prevents fetchInProgress flags from blocking subsequent fetches
 * 
 * PREVIOUS FIXES:
 * v77.0 - Component loading states subscribe to instant reset
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
    console.log('🔄 v79.1 - Starting visibility coordinator (with flag reset)');
    
    // v79.1: Start listening for visibility changes
    visibilityCoordinator.startListening();

    return () => {
      console.log('🔄 v79.1 - Stopping visibility coordinator');
      visibilityCoordinator.stopListening();
    };
  }, [queryClient]);

  return (
    <TabVisibilityContext.Provider value={{ coordinator: visibilityCoordinator }}>
      {children}
    </TabVisibilityContext.Provider>
  );
};
