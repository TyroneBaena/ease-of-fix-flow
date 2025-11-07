import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { visibilityCoordinator } from '@/utils/visibilityCoordinator';

/**
 * v50.0 - Eliminated Duplicate Database Queries
 * 
 * Provides access to visibility coordinator singleton.
 * Restores sessions on the app's singleton client without duplicate queries.
 * Auth state listener handles user conversion, coordinator only verifies.
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
    console.log('🔄 v50.0 - Starting visibility coordinator');
    visibilityCoordinator.startListening();

    return () => {
      console.log('🔄 v50.0 - Stopping visibility coordinator');
      visibilityCoordinator.stopListening();
    };
  }, []);

  return (
    <TabVisibilityContext.Provider value={{ coordinator: visibilityCoordinator }}>
      {children}
    </TabVisibilityContext.Provider>
  );
};
