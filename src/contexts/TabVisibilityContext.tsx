import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { visibilityCoordinator } from '@/utils/visibilityCoordinator';
import { useSimpleAuth } from './UnifiedAuthContext';

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
  const { isSessionReady } = useSimpleAuth();
  
  useEffect(() => {
    console.log('🔄 TabVisibilityProvider - Starting coordinator');
    
    // Provide session ready callback to coordinator
    visibilityCoordinator.setSessionReadyCallback(() => isSessionReady);
    visibilityCoordinator.startListening();

    return () => {
      console.log('🔄 TabVisibilityProvider - Stopping coordinator');
      visibilityCoordinator.stopListening();
    };
  }, [isSessionReady]);

  return (
    <TabVisibilityContext.Provider value={{ coordinator: visibilityCoordinator }}>
      {children}
    </TabVisibilityContext.Provider>
  );
};
