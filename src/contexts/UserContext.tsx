import React, { createContext, useContext, ReactNode } from 'react';
import { useSimpleAuth } from './SimpleAuthContext';
import { UserContextType } from './user/UserContextTypes';
import { isUserAdmin, canUserAccessProperty } from '@/utils/userRoles';
import { UserRole } from '@/types/user';

// Create the context with undefined as default value
const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser, signOut } = useSimpleAuth();

  // Create context value with direct property access for admin checks
  const contextValue: UserContextType = {
    currentUser,
    users: [], // Empty array for now - can be populated if needed
    loading: false, // SimpleAuth handles its own loading
    loadingError: null,
    fetchUsers: async () => {}, // Stub for now
    addUser: async (email: string, name: string, role: UserRole, assignedProperties?: string[]) => ({
      success: false,
      message: 'Not implemented in simplified auth'
    }),
    updateUser: async (user) => {}, // Stub for now
    removeUser: async (userId: string) => {}, // Stub for now
    resetPassword: async (userId: string, email: string) => ({
      success: false,
      message: 'Not implemented in simplified auth'
    }),
    adminResetPassword: async (userId: string, email: string) => ({
      success: false,
      message: 'Not implemented in simplified auth'
    }),
    // Use utility functions to avoid RLS recursion
    isAdmin: isUserAdmin(currentUser),
    // Use utility function for property access
    canAccessProperty: (propertyId: string) => canUserAccessProperty(currentUser, propertyId),
    signOut
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
};