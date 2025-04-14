import { useState, useCallback, useEffect, useRef } from 'react';
import { User, UserRole } from '@/types/user';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { userService } from '@/services/userService';
import { toast } from "sonner";

// Define the return type for the addUser function
export interface AddUserResult {
  success: boolean;
  message: string;
  userId?: string;
  emailSent?: boolean;
  emailError?: string;
  testMode?: boolean;
  testModeInfo?: string;
}

export const useUserProvider = () => {
  const { currentUser, loading: authLoading, signOut } = useSupabaseAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<Error | null>(null);
  const [fetchInProgress, setFetchInProgress] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const isAdmin = currentUser?.role === 'admin' || false;

  const fetchUsers = useCallback(async () => {
    // Prevent multiple concurrent fetches and refetches
    if (fetchInProgress || !isAdmin) {
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
      setHasFetched(true);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoadingError(error as Error);
    } finally {
      setLoading(false);
      setFetchInProgress(false);
    }
  }, [isAdmin, fetchInProgress]);

  // Add a useEffect to ensure we fetch users when the component mounts and user is admin
  useEffect(() => {
    if (isAdmin && !hasFetched && !fetchInProgress && !authLoading) {
      // Only fetch when auth is not loading
      console.log("Auto-fetching users since user is admin");
      fetchUsers().catch(console.error);
    }
  }, [isAdmin, hasFetched, fetchInProgress, fetchUsers, authLoading]);

  const addUser = async (email: string, name: string, role: UserRole, assignedProperties: string[] = []): Promise<AddUserResult> => {
    try {
      setLoading(true);
      const result = await userService.inviteUser(email, name, role, assignedProperties);
      
      // Only refetch users if we're admin and the invite was successful
      if (isAdmin && result.success) {
        setHasFetched(false); // Force a refetch next time
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

  return {
    currentUser,
    users,
    loading: loading || authLoading,
    loadingError,
    fetchUsers,
    addUser,
    updateUser,
    removeUser,
    resetPassword,
    signOut
  };
};
