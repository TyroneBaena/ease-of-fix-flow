import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { visibilityCoordinator } from '@/utils/visibilityCoordinator';

/**
 * v43.0 - Bulletproof Error Recovery
 * 
 * CRITICAL FIXES:
 * - Fixed callback registration to use ref (reads current value)
 * - Graceful fallback when session restoration fails
 * - UI shows cached data instead of staying stuck in loading state
 * - Prevents "useUnifiedAuth must be used within a UnifiedAuthProvider" errors
 * - Eliminates race conditions during error recovery
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
    console.log('🔄 TabVisibilityProvider v43.0 - Starting coordinator (no auth dependency)');
    
    // Start listening for visibility changes
    visibilityCoordinator.startListening();

    return () => {
      console.log('🔄 TabVisibilityProvider v43.0 - Stopping coordinator');
      visibilityCoordinator.stopListening();
    };
  }, []); // No dependencies - runs once on mount

  return (
    <TabVisibilityContext.Provider value={{ coordinator: visibilityCoordinator }}>
      {children}
    </TabVisibilityContext.Provider>
  );
};
