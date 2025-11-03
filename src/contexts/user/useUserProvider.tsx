import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { User, UserRole } from '@/types/user';
import { useMultiOrganizationContext } from '@/contexts/UnifiedAuthContext';
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
  isExistingUserAddedToOrg?: boolean;
  email?: string;
}

export const useUserProvider = () => {
  const multiOrgContext = useMultiOrganizationContext();
  const { currentUser, loading: authLoading } = multiOrgContext;
  
  // Create a simple sign out function that doesn't require the full auth context
  const signOut = async () => {
    const { signOutUser } = await import('@/hooks/auth/authOperations');
    await signOutUser();
  };
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<Error | null>(null);
  const isAdmin = currentUser?.role === 'admin' || false;
  const canFetchUsers = useMemo(() => 
    currentUser?.role === 'admin' || currentUser?.role === 'manager', 
    [currentUser?.role]
  );
  const fetchInProgress = useRef(false);
  const lastFetchedUserIdRef = useRef<string | null>(null);
  const lastFetchedOrgIdRef = useRef<string | null>(null);

  // Debug logging for auth state
  useEffect(() => {
    console.log('👤 UserProvider: Auth state changed', {
      currentUser: currentUser ? {
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role,
        organization_id: currentUser.organization_id
      } : null,
      authLoading,
      isAdmin,
      canFetchUsers
    });
  }, [currentUser?.id, authLoading, isAdmin, canFetchUsers]);

  const fetchUsers = useCallback(async () => {
    // Prevent concurrent fetches and only allow admins and managers
    if (fetchInProgress.current || !canFetchUsers) {
      console.log("👥 Fetch skipped: already in progress or not admin/manager", {
        fetchInProgress: fetchInProgress.current,
        canFetchUsers,
        currentUserRole: currentUser?.role
      });
      return;
    }

    // Log organization info but don't block fetch - admin users should be able to fetch all users
    console.log("👥 Organization info:", {
      hasCurrentUser: !!currentUser,
      organization_id: currentUser?.organization_id,
      role: currentUser?.role
    });

    try {
      console.log("👥 Starting user fetch for role:", currentUser?.role);
      console.log("👥 Current user org:", currentUser?.organization_id);
      console.log("👥 Current session org:", currentUser?.session_organization_id);
      fetchInProgress.current = true;
      setLoading(true);
      const allUsers = await userService.getAllUsers();
      console.log("👥 Fetched users successfully:", {
        count: allUsers.length,
        users: allUsers.map(u => ({ 
          id: u.id, 
          email: u.email, 
          role: u.role,
          name: u.name,
          organization_id: u.organization_id 
        }))
      });
      setUsers(allUsers);
      setLoadingError(null);
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      setLoadingError(error as Error);
      
      // More specific error messages
      if (error.message?.includes('0 rows')) {
        toast.error("No users found - this may be an authentication issue");
      } else if (error.message?.includes('406')) {
        toast.error("Access denied - please check your role and organization");
      } else {
        toast.error(`Failed to load users: ${error.message}`);
      }
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  }, [canFetchUsers, currentUser?.role, currentUser?.organization_id, currentUser?.session_organization_id]);

  // Force fetch users when component mounts and user is admin or manager
  // CRITICAL FIX: Only refetch if user ID or org ID actually changed
  useEffect(() => {
    console.log('👥 UserProvider: useEffect triggered', {
      canFetchUsers,
      currentUserId: currentUser?.id,
      currentOrgId: currentUser?.organization_id,
      lastFetchedUserId: lastFetchedUserIdRef.current,
      lastFetchedOrgId: lastFetchedOrgIdRef.current
    });
    
    if (!canFetchUsers) {
      console.log('👥 UserProvider: User cannot fetch users, skipping');
      return;
    }
    
    // Check if user ID or org ID actually changed
    const userIdChanged = lastFetchedUserIdRef.current !== currentUser?.id;
    const orgIdChanged = lastFetchedOrgIdRef.current !== currentUser?.organization_id;
    
    if (!userIdChanged && !orgIdChanged) {
      console.log("👥 UserProvider: No changes detected, skipping fetch");
      return;
    }
    
    if (!fetchInProgress.current) {
      console.log("👥 UserProvider: Changes detected, auto-fetching users");
      lastFetchedUserIdRef.current = currentUser?.id || null;
      lastFetchedOrgIdRef.current = currentUser?.organization_id || null;
      // Force refresh by clearing any existing data
      setUsers([]);
      fetchUsers().catch(console.error);
    }
  }, [canFetchUsers, currentUser?.id, currentUser?.organization_id, fetchUsers]); // Use IDs only


  const addUser = async (email: string, name: string, role: UserRole, assignedProperties: string[] = []): Promise<AddUserResult> => {
    try {
      setLoading(true);
      
      // Normalize email
      const normalizedEmail = email.toLowerCase().trim();
      
      // We'll let the backend handle the existence check to avoid race conditions
      // and have a single source of truth
      const result = await userService.inviteUser(normalizedEmail, name, role, assignedProperties);
      
      // Only refetch users if we're admin/manager and the invite was successful
      if (canFetchUsers && result.success) {
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
    loading: authLoading, // Only use authLoading for user context loading state
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