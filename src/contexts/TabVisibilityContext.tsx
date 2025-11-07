import React, { createContext, useContext, useEffect, ReactNode, useRef } from 'react';
import { visibilityCoordinator } from '@/utils/visibilityCoordinator';
import { useUnifiedAuth } from './UnifiedAuthContext';

/**
 * v55.0 - CRITICAL FIX: Session ready callback with current values
 * 
 * BUGS FIXED:
 * 1. Session ready callback now uses ref to access CURRENT auth state (not stale closure)
 * 2. Properties now load on initial login
 * 3. Tab revisit coordination doesn't timeout waiting for stale session state
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
  const { isSessionReady, currentUser } = useUnifiedAuth();
  
  // CRITICAL v55.0: Use ref to hold CURRENT auth state for session ready callback
  const authStateRef = useRef({ isSessionReady, currentUser });
  
  // Update ref whenever auth state changes
  useEffect(() => {
    authStateRef.current = { isSessionReady, currentUser };
    console.log('🔄 v55.0 - Auth state updated in ref:', { 
      isSessionReady, 
      hasUser: !!currentUser?.id 
    });
  }, [isSessionReady, currentUser]);

  useEffect(() => {
    console.log('🔄 v55.0 - Starting visibility coordinator');
    
    // CRITICAL v55.0: Set session ready callback that accesses CURRENT values via ref
    visibilityCoordinator.setSessionReadyCallback(() => {
      const current = authStateRef.current;
      const ready = current.isSessionReady && !!current.currentUser?.id;
      console.log('🔍 v55.0 - Session ready check:', { 
        isSessionReady: current.isSessionReady,
        hasUser: !!current.currentUser?.id,
        result: ready
      });
      return ready;
    });
    
    visibilityCoordinator.startListening();

    return () => {
      console.log('🔄 v55.0 - Stopping visibility coordinator');
      visibilityCoordinator.stopListening();
    };
  }, []);

  return (
    <TabVisibilityContext.Provider value={{ coordinator: visibilityCoordinator }}>
      {children}
    </TabVisibilityContext.Provider>
  );
};
