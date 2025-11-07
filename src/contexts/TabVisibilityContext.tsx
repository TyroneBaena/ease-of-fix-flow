import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { visibilityCoordinator } from '@/utils/visibilityCoordinator';

/**
 * v47.0 - Fixed hanging setSession with timeout wrapper
 * 
 * Provides access to visibility coordinator singleton.
 * Shows loader during tab revisit session restoration.
 * Handles all edge cases: quick switches, long idle, expired sessions.
 * v47.0: Fixed infinite hang in setSession() on second tab revisit
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
    console.log('🔄 v47.0 - Starting visibility coordinator with setSession timeout fix');
    visibilityCoordinator.startListening();

    return () => {
      console.log('🔄 v47.0 - Stopping visibility coordinator');
      visibilityCoordinator.stopListening();
    };
  }, []);

  return (
    <TabVisibilityContext.Provider value={{ coordinator: visibilityCoordinator }}>
      {children}
    </TabVisibilityContext.Provider>
  );
};
