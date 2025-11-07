import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { visibilityCoordinator } from '@/utils/visibilityCoordinator';

/**
 * v53.0 - Handler Queueing During Coordination
 * 
 * Provides access to visibility coordinator singleton.
 * - Handlers queue during coordination instead of being blocked
 * - Queued handlers are registered after coordination completes
 * - Data fetch callbacks check for currentUser to prevent errors
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
    console.log('🔄 v53.0 - Starting visibility coordinator');
    visibilityCoordinator.startListening();

    return () => {
      console.log('🔄 v53.0 - Stopping visibility coordinator');
      visibilityCoordinator.stopListening();
    };
  }, []);

  return (
    <TabVisibilityContext.Provider value={{ coordinator: visibilityCoordinator }}>
      {children}
    </TabVisibilityContext.Provider>
  );
};
