
import { useState, useCallback, useEffect, useRef } from 'react';
import { User, UserRole } from '@/types/user';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { userService } from '@/services/userService';
import { toast } from "sonner";
import { AdminPasswordResetResult } from '@/services/user/adminPasswordReset';

// Define the return type for the addUser function
export interface AddUserResult {
  success: boolean;
  message: string;
  userId?: string;
  emailSent?: boolean;
  emailError?: string;
  testMode?: boolean;
  testModeInfo?: string;
  isNewUser?: boolean;
  email?: string;
}

export const useUserProvider = () => {
  const { currentUser, loading: authLoading, signOut } = useSupabaseAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<Error | null>(null);
  const isAdmin = currentUser?.role === 'admin' || false;
  const fetchInProgress = useRef(false);

  const fetchUsers = useCallback(async () => {
    // Prevent concurrent fetches and only allow admins
    if (fetchInProgress.current || !isAdmin) {
      console.log("Fetch skipped: already in progress or not admin");
      return;
    }

    try {
      console.log("Starting user fetch");
      fetchInProgress.current = true;
      setLoading(true);
      const allUsers = await userService.getAllUsers();
      console.log("Fetched users:", allUsers);
      setUsers(allUsers);
      setLoadingError(null);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoadingError(error as Error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  }, [isAdmin]);

  // Only fetch users when the component mounts and user is admin
  useEffect(() => {
    if (isAdmin && !fetchInProgress.current) {
      console.log("Auto-fetching users since user is admin");
      fetchUsers().catch(console.error);
    }
  }, [isAdmin, fetchUsers]);

  const addUser = async (email: string, name: string, role: UserRole, assignedProperties: string[] = []): Promise<AddUserResult> => {
    try {
      setLoading(true);
      console.log("Starting user invite process for email:", email);
      
      // Normalize email
      const normalizedEmail = email.toLowerCase().trim();
      
      // We'll let the backend handle the existence check to avoid race conditions
      // and have a single source of truth
      console.log("Sending invitation directly to backend service");
      
      const result = await userService.inviteUser(normalizedEmail, name, role, assignedProperties);
      console.log("Invite user result:", result);
      
      // Only refetch users if we're admin and the invite was successful
      if (isAdmin && result.success) {
        console.log("User invite was successful, refreshing user list");
        // Force a refetch
        fetchInProgress.current = false;
        await fetchUsers();
      }
      
      return result;
    } catch (error: any) {
      console.error('Error adding user:', error);
      return {
        success: false,
        message: `Failed to process invitation: ${error.message || "Unknown error"}`,
      };
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
      // Fix: Pass both userId and email to the resetPassword method
      const result = await userService.resetPassword(userId, email);
      
      if (result.success) {
        return result;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  const adminResetPassword = async (userId: string, email: string): Promise<AdminPasswordResetResult> => {
    try {
      setLoading(true);
      // Use the new admin reset password function
      const result = await userService.adminResetPassword(userId, email);
      
      if (result.success) {
        toast.success(`Password reset successful for ${email}`);
      } else {
        toast.error(`Failed to reset password: ${result.message}`);
      }
      
      return result;
    } catch (error: any) {
      console.error('Error in admin password reset:', error);
      toast.error(`Admin password reset failed: ${error.message || "Unknown error"}`);
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
    adminResetPassword,
    signOut
  };
};
