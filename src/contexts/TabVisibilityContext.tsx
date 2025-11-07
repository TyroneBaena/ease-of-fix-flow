import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { visibilityCoordinator } from '@/utils/visibilityCoordinator';

/**
 * v54.0 - Complete Handler Lifecycle Management
 * 
 * Provides access to visibility coordinator singleton.
 * - Handlers properly cleaned up from both pending and active arrays
 * - Handler deduplication prevents duplicate registrations
 * - Data fetch callbacks verify user exists before querying
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
  useEffect(() => {
    console.log('🔄 v54.0 - Starting visibility coordinator');
    visibilityCoordinator.startListening();

    return () => {
      console.log('🔄 v54.0 - Stopping visibility coordinator');
      visibilityCoordinator.stopListening();
    };
  }, []);

  return (
    <TabVisibilityContext.Provider value={{ coordinator: visibilityCoordinator }}>
      {children}
    </TabVisibilityContext.Provider>
  );
};
