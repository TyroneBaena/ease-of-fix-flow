import React, { createContext, useContext, useEffect, ReactNode, useRef } from 'react';
import { visibilityCoordinator } from '@/utils/visibilityCoordinator';
import { useUnifiedAuth } from './UnifiedAuthContext';

/**
 * v60.0 - SINGLE session ready callback registration (cookie-based session)
 * 
 * ARCHITECTURE:
 * 1. This is the ONLY place that registers session ready callback
 * 2. Uses ref to access CURRENT auth state (not stale closure)
 * 3. Cookie-based session restoration via /session endpoint
 * 
 * PREVIOUS FIXES:
 * v56.0 - Removed duplicate callback registration from UnifiedAuthContext
 * v55.0 - Session ready callback uses ref for current values
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
    console.log('🔄 v60.0 - Starting visibility coordinator (cookie-based session)');
    
    // CRITICAL v60.0: ONLY place that registers session ready callback
    visibilityCoordinator.setSessionReadyCallback(() => {
      const current = authStateRef.current;
      const ready = current.isSessionReady && !!current.currentUser?.id;
      console.log('🔍 v60.0 - Session ready check:', { 
        isSessionReady: current.isSessionReady,
        hasUser: !!current.currentUser?.id,
        userEmail: current.currentUser?.email,
        result: ready
      });
      return ready;
    });
    
    visibilityCoordinator.startListening();

    return () => {
      console.log('🔄 v60.0 - Stopping visibility coordinator');
      visibilityCoordinator.stopListening();
    };
  }, []);

  return (
    <TabVisibilityContext.Provider value={{ coordinator: visibilityCoordinator }}>
      {children}
    </TabVisibilityContext.Provider>
  );
};
