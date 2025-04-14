
import React, { createContext, useContext, ReactNode } from 'react';
import { useUserProvider } from './user/useUserProvider';
import { UserContextType } from './user/UserContextTypes';

// Create the context with undefined as default value
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

  // Create context value with direct property access for admin checks
  const contextValue: UserContextType = {
    currentUser,
    users,
    loading,
    fetchUsers,
    addUser,
    updateUser,
    removeUser,
    resetPassword,
    // Use direct role check for isAdmin - don't use a function to prevent unnecessary rerenders
    isAdmin: currentUser?.role === 'admin' || false,
    // Use direct role check for canAccessProperty - don't use a function to prevent unnecessary rerenders
    canAccessProperty: (propertyId: string) => 
      currentUser?.role === 'admin' || currentUser?.assignedProperties?.includes(propertyId) || false,
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
