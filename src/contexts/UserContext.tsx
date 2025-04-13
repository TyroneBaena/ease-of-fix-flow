
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole } from '@/types/user';

// Mock current user for demo purposes
const MOCK_CURRENT_USER: User = {
  id: '1',
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'admin',
  createdAt: new Date().toISOString()
};

interface UserContextType {
  currentUser: User | null;
  users: User[];
  setCurrentUser: (user: User | null) => void;
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  removeUser: (userId: string) => void;
  isAdmin: () => boolean;
  canAccessProperty: (propertyId: string) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(MOCK_CURRENT_USER);
  const [users, setUsers] = useState<User[]>([
    MOCK_CURRENT_USER,
    {
      id: '2',
      name: 'Manager User',
      email: 'manager@example.com',
      role: 'manager',
      assignedProperties: ['1', '3'],
      createdAt: new Date().toISOString()
    }
  ]);

  const addUser = (user: User) => {
    setUsers([...users, user]);
  };

  const updateUser = (updatedUser: User) => {
    setUsers(users.map(user => user.id === updatedUser.id ? updatedUser : user));
  };

  const removeUser = (userId: string) => {
    setUsers(users.filter(user => user.id !== userId));
  };

  const isAdmin = () => {
    return currentUser?.role === 'admin';
  };

  const canAccessProperty = (propertyId: string) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return currentUser.assignedProperties?.includes(propertyId) || false;
  };

  return (
    <UserContext.Provider value={{
      currentUser,
      users,
      setCurrentUser,
      addUser,
      updateUser,
      removeUser,
      isAdmin,
      canAccessProperty
    }}>
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
