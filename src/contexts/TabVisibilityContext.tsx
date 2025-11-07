import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { visibilityCoordinator } from '@/utils/visibilityCoordinator';

/**
 * v67.0 - Simplified visibility coordinator management
 * 
 * ARCHITECTURE CHANGE (v67.0):
 * - No longer registers session ready callback (coordinator doesn't wait for session)
 * - Session management is fully delegated to UnifiedAuthContext handler
 * - Coordinator only manages handler orchestration
 * 
 * PREVIOUS FIXES:
 * v60.0 - Registered session ready callback (REMOVED in v67.0)
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
  // v67.0: Removed auth state tracking - no longer needed
  // Session management is handled by UnifiedAuthContext handler

  useEffect(() => {
    console.log('🔄 v67.0 - Starting visibility coordinator (handler orchestration only)');
    
    // v67.0: No session ready callback - coordinator just runs handlers
    visibilityCoordinator.startListening();

    return () => {
      console.log('🔄 v67.0 - Stopping visibility coordinator');
      visibilityCoordinator.stopListening();
    };
  }, []);

  return (
    <TabVisibilityContext.Provider value={{ coordinator: visibilityCoordinator }}>
      {children}
    </TabVisibilityContext.Provider>
  );
};
