import React, { createContext, useContext, useState, useCallback } from 'react';
import { User, UserRole } from '@/types/user';
import { userService, InviteUserResult } from '@/services/userService';
import { useSimpleAuth } from '@/contexts/UnifiedAuthContext';

interface UserContextType {
  users: User[];
  loading: boolean;
  loadingError: Error | null;
  fetchUsers: () => Promise<void>;
  addUser: (email: string, name: string, role: UserRole, assignedProperties?: string[]) => Promise<InviteUserResult>;
  updateUser: (user: User) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  resetPassword: (userId: string, email: string) => Promise<{ success: boolean; message: string }>;
  adminResetPassword: (userId: string, email: string) => Promise<any>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAdmin, isSessionReady } = useSimpleAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<Error | null>(null);
  
  // v77.0: Note - This context has action-based loading (not automatic),
  // so instant reset isn't needed. Loading only shows during user actions
  // (add/update/remove), not on tab revisits.

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) {
      console.log('🔧 UserContext - Not fetching users (not admin)');
      return;
    }
    
    if (!isSessionReady) {
      console.log('🔧 UserContext - Not fetching users (session not ready)');
      return;
    }

    try {
      setLoading(true);
      setLoadingError(null);
      console.log('🔧 v79.3 - UserContext: Fetching users (session ready)');
      
      const userData = await userService.getAllUsers(isSessionReady);
      setUsers(userData);
      console.log('✅ v79.3 - UserContext: Users fetched:', userData.length);
    } catch (error) {
      console.error('❌ v79.3 - UserContext: Error:', error);
      setLoadingError(error as Error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isSessionReady]);

  const addUser = useCallback(async (
    email: string, 
    name: string, 
    role: UserRole, 
    assignedProperties?: string[]
  ): Promise<InviteUserResult> => {
    try {
      console.log('🔧 UserContext - Adding user:', { email, name, role });
      
      const result = await userService.inviteUser(email, name, role, assignedProperties);
      
      if (result.success) {
        // Refresh users list
        await fetchUsers();
      }
      
      return result;
    } catch (error) {
      console.error('🔧 UserContext - Error adding user:', error);
      return {
        success: false,
        message: 'Failed to add user',
        email
      };
    }
  }, [fetchUsers]);

  const updateUser = useCallback(async (user: User) => {
    try {
      await userService.updateUser(user);
      
      // Update the local state
      setUsers(prev => prev.map(u => u.id === user.id ? user : u));
    } catch (error) {
      console.error('🔧 UserContext - Error updating user:', error);
      throw error;
    }
  }, []);

  const removeUser = useCallback(async (userId: string) => {
    try {
      // Prevent self-deletion
      if (currentUser?.id === userId) {
        throw new Error('Cannot delete your own account');
      }

      await userService.deleteUser(userId);
      
      // Remove from local state
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error('🔧 UserContext - Error removing user:', error);
      throw error;
    }
  }, [currentUser?.id]);

  const resetPassword = useCallback(async (userId: string, email: string) => {
    return await userService.resetPassword(userId, email);
  }, []);

  const adminResetPassword = useCallback(async (userId: string, email: string) => {
    return await userService.adminResetPassword(userId, email);
  }, []);

  const value: UserContextType = {
    users,
    loading,
    loadingError,
    fetchUsers,
    addUser,
    updateUser,
    removeUser,
    resetPassword,
    adminResetPassword
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};