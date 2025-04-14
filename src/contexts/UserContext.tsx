
import React, { createContext, useContext, ReactNode } from 'react';
import { useUserProvider } from './user/useUserProvider';
import { UserContextType } from './user/UserContextTypes';
import { isUserAdmin, canUserAccessProperty } from './user/userUtils';

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const {
    currentUser,
    users,
    loading,
    fetchUsers,
    addUser,
    updateUser,
    removeUser,
    resetPassword,
    signOut
  } = useUserProvider();

  // Create context value with utility functions
  const contextValue: UserContextType = {
    currentUser,
    users,
    loading,
    fetchUsers,
    addUser,
    updateUser,
    removeUser,
    resetPassword,
    isAdmin: () => isUserAdmin(currentUser),
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
