import React, { createContext, useContext, useEffect, ReactNode, useRef } from 'react';
import { visibilityCoordinator } from '@/utils/visibilityCoordinator';
import { useUnifiedAuth } from './UnifiedAuthContext';

/**
 * v56.0 - SINGLE session ready callback registration (removed from UnifiedAuthContext)
 * 
 * BUGS FIXED IN v56.0:
 * 1. Now the ONLY place that registers session ready callback (removed duplicate in UnifiedAuthContext)
 * 2. Prevents callback collision that caused unpredictable behavior
 * 
 * PREVIOUS FIXES (v55.0):
 * 1. Session ready callback uses ref to access CURRENT auth state (not stale closure)
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
    console.log('🔄 v56.0 - Starting visibility coordinator (SINGLE callback registration point)');
    
    // CRITICAL v56.0: ONLY place that registers session ready callback
    // Removed duplicate registration from UnifiedAuthContext to prevent collision
    visibilityCoordinator.setSessionReadyCallback(() => {
      const current = authStateRef.current;
      const ready = current.isSessionReady && !!current.currentUser?.id;
      console.log('🔍 v56.0 - Session ready check:', { 
        isSessionReady: current.isSessionReady,
        hasUser: !!current.currentUser?.id,
        userEmail: current.currentUser?.email,
        result: ready
      });
      return ready;
    });
    
    visibilityCoordinator.startListening();

    return () => {
      console.log('🔄 v56.0 - Stopping visibility coordinator');
      visibilityCoordinator.stopListening();
    };
  }, []);

  return (
    <TabVisibilityContext.Provider value={{ coordinator: visibilityCoordinator }}>
      {children}
    </TabVisibilityContext.Provider>
  );
};
