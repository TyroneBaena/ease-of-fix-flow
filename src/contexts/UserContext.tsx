
import React, { createContext, useContext, ReactNode } from 'react';
import { useUserProvider } from './user/useUserProvider';
import { UserContextType } from './user/UserContextTypes';
import { isUserAdmin, canUserAccessProperty } from '@/utils/userRoles';

// Create the context with undefined as default value
const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const {
    currentUser,
    users,
    loading,
    loadingError,
    fetchUsers,
    addUser,
    updateUser,
    removeUser,
    resetPassword,
    adminResetPassword,
    signOut
  } = useUserProvider();

  // Create context value with direct property access for admin checks
  const contextValue: UserContextType = {
    currentUser,
    users,
    loading,
    loadingError,
    fetchUsers,
    addUser,
    updateUser,
    removeUser,
    resetPassword,
    adminResetPassword,
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
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
};
