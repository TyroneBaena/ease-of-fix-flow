import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
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
}

interface UserContextType {
  currentUser: User | null;
  users: User[];
  loading: boolean;
  fetchUsers: () => Promise<void>;
  addUser: (email: string, name: string, role: UserRole, assignedProperties?: string[]) => Promise<AddUserResult>;
  updateUser: (user: User) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
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

  // Fetch users when currentUser changes (if they're an admin)
  useEffect(() => {
    if (currentUser && currentUser.role === 'admin') {
      fetchUsers().catch(error => {
        // Only show one error toast maximum
        if (!loadingError) {
          setLoadingError(error);
        }
      });
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      return;
    }

    try {
      setLoading(true);
      const allUsers = await userService.getAllUsers();
      setUsers(allUsers);
      // Reset loading error if successful
      setLoadingError(null);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoadingError(error as Error);
      // Don't show toast here as it might pop up repeatedly
    } finally {
      setLoading(false);
    }
  };

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
      
      // Update local state
      setUsers(users.map(user => 
        user.id === updatedUser.id ? updatedUser : user
      ));
    } catch (error) {
      console.error('Error updating user:', error);
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
      
      // Update local state
      setUsers(users.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Error removing user:', error);
      throw error;
    } finally {
      setLoading(false);
    }
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
      loading: loading || authLoading,
      fetchUsers,
      addUser,
      updateUser,
      removeUser,
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
