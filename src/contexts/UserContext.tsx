
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { User, UserRole } from '@/types/user';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { userService } from '@/services/userService';
import { toast } from "sonner";

// Define the return type for the addUser function
interface AddUserResult {
  success: boolean;
  message: string;
  userId?: string;
  emailSent?: boolean;
  emailError?: string;
  testMode?: boolean; // New field to track if email was sent in test mode
  testModeInfo?: string; // Info about test mode
}

interface UserContextType {
  currentUser: User | null;
  users: User[];
  loading: boolean;
  fetchUsers: () => Promise<void>;
  addUser: (email: string, name: string, role: UserRole, assignedProperties?: string[]) => Promise<AddUserResult>;
  updateUser: (user: User) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  resetPassword: (userId: string, email: string) => Promise<void>;
  isAdmin: () => boolean;
  canAccessProperty: (propertyId: string) => boolean;
  signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser, loading: authLoading, signOut } = useSupabaseAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<Error | null>(null);
  const [fetchInProgress, setFetchInProgress] = useState(false);

  // Fetch users only when currentUser changes, not on every render
  useEffect(() => {
    if (currentUser && currentUser.role === 'admin') {
      fetchUsers().catch(error => {
        if (!loadingError) {
          setLoadingError(error);
        }
      });
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const fetchUsers = useCallback(async () => {
    // Prevent multiple concurrent fetches
    if (fetchInProgress || !currentUser || currentUser.role !== 'admin') {
      console.log("Fetch skipped: already in progress or not admin");
      return;
    }

    try {
      console.log("Starting user fetch");
      setFetchInProgress(true);
      setLoading(true);
      const allUsers = await userService.getAllUsers();
      console.log("Fetched users:", allUsers);
      setUsers(allUsers);
      setLoadingError(null);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoadingError(error as Error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
      setFetchInProgress(false);
    }
  }, [currentUser, fetchInProgress]);

  const addUser = async (email: string, name: string, role: UserRole, assignedProperties: string[] = []): Promise<AddUserResult> => {
    try {
      setLoading(true);
      const result = await userService.inviteUser(email, name, role, assignedProperties);
      
      if (currentUser?.role === 'admin') {
        await fetchUsers();
      }
      
      return result;
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (updatedUser: User) => {
    try {
      setLoading(true);
      await userService.updateUser(updatedUser);
      
      setUsers(users.map(user => 
        user.id === updatedUser.id ? updatedUser : user
      ));
      
      toast.success(`User ${updatedUser.name} updated successfully`);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error("Failed to update user");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (userId: string, email: string) => {
    try {
      setLoading(true);
      await userService.resetPassword(email);
      toast.success(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error("Failed to send password reset email");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const removeUser = async (userId: string) => {
    if (userId === currentUser?.id) {
      throw new Error("You cannot delete your own account");
    }

    try {
      setLoading(true);
      await userService.deleteUser(userId);
      
      setUsers(users.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Error removing user:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = useCallback(() => {
    return currentUser?.role === 'admin';
  }, [currentUser]);

  const canAccessProperty = useCallback((propertyId: string) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return currentUser.assignedProperties?.includes(propertyId) || false;
  }, [currentUser]);

  return (
    <UserContext.Provider value={{
      currentUser,
      users,
      loading: loading || authLoading,
      fetchUsers,
      addUser,
      updateUser,
      removeUser,
      resetPassword,
      isAdmin,
      canAccessProperty,
      signOut
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
