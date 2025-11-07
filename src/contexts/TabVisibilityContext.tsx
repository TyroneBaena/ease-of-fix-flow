import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { visibilityCoordinator } from '@/utils/visibilityCoordinator';

/**
 * v42.0 - Fixed Dependency Inversion
 * 
 * CRITICAL FIX: Removed dependency on UnifiedAuthContext
 * - TabVisibilityProvider no longer calls useSimpleAuth()
 * - UnifiedAuthProvider registers its isSessionReady callback directly
 * - This prevents "useUnifiedAuth must be used within a UnifiedAuthProvider" errors
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
    console.log('🔄 TabVisibilityProvider v42.0 - Starting coordinator (no auth dependency)');
    
    // Start listening for visibility changes
    visibilityCoordinator.startListening();

    return () => {
      console.log('🔄 TabVisibilityProvider v42.0 - Stopping coordinator');
      visibilityCoordinator.stopListening();
    };
  }, []); // No dependencies - runs once on mount

  return (
    <TabVisibilityContext.Provider value={{ coordinator: visibilityCoordinator }}>
      {children}
    </TabVisibilityContext.Provider>
  );
};
