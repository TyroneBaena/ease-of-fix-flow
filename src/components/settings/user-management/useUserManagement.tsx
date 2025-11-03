
import { useCallback, useMemo, useState, useEffect } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { useSimpleAuth } from '@/contexts/UnifiedAuthContext';
import { usePropertyContext } from '@/contexts/property';
import { useUserPagination, USERS_PER_PAGE } from './hooks/useUserPagination';
import { useUserDialog } from './hooks/useUserDialog';
import { useUserActions } from './hooks/useUserActions';
import { User } from '@/types/user';
import { toast } from 'sonner';

export const useUserManagement = () => {
  const { users, fetchUsers: fetchUsersFromContext, loadingError: userContextError } = useUserContext();
  const { currentUser, isAdmin, session } = useSimpleAuth();
  const { properties } = usePropertyContext();
  const [fetchedOnce, setFetchedOnce] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [fetchError, setFetchError] = useState<Error | null>(null);
  const [ready, setReady] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  
  // Function to safely fetch users
  const fetchUsers = useCallback(async () => {
    console.log("🔄 fetchUsers - Starting, isAdmin:", isAdmin);
    
    if (!isAdmin) {
      console.log("Not fetching users because user is not admin");
      setIsLoadingUsers(false);
      setFetchedOnce(true);
      return;
    }

    try {
      console.log("Fetching users from useUserManagement");
      setIsLoadingUsers(true);
      setFetchError(null);
      await fetchUsersFromContext();
      setFetchedOnce(true);
      setLastRefreshTime(Date.now());
      console.log("✅ fetchUsers - Success");
    } catch (error) {
      console.error("❌ fetchUsers - Error:", error);
      setFetchError(error as Error);
      toast.error("Failed to load users. Please try again.");
    } finally {
      console.log("🏁 fetchUsers - Finally block, resetting loading");
      setIsLoadingUsers(false);
    }
  }, [isAdmin, fetchUsersFromContext]); // Include dependencies

  // Set up pagination
  const { currentPage, totalPages, handlePageChange } = useUserPagination(users.length);
  
  // Set up dialog management
  const {
    isDialogOpen,
    setIsDialogOpen,
    isEditMode,
    selectedUser,
    newUser,
    handleOpenDialog,
    handleUserChange,
    handlePropertySelection,
    isPreparingDialog
  } = useUserDialog(session);
  
  // Set up user actions
  const {
    isLoading,
    isDeleteConfirmOpen,
    isManualResetOpen,
    setIsDeleteConfirmOpen,
    handleSaveUser,
    handleResetPassword,
    openManualReset,
    ManualResetDialog,
    confirmDeleteUser,
    handleDeleteUser,
    userToDelete
  } = useUserActions(
    setIsDialogOpen,
    isEditMode,
    selectedUser,
    newUser,
    currentPage,
    handlePageChange,
    USERS_PER_PAGE,
    fetchUsers // Pass the fetchUsers function to the actions hook
  );
  
  // Clean form error management - no need for window object
  
  // Update fetchError if there's an error in the user context
  useEffect(() => {
    if (userContextError) {
      setFetchError(userContextError);
    }
  }, [userContextError]);
  
  // Clean form error management - no need for window object

  // Fetch users when component mounts
  useEffect(() => {
    if (isAdmin && !fetchedOnce && !isLoadingUsers) {
      console.log("Initial fetch for admin user");
      fetchUsers();
    }
  }, [isAdmin, fetchedOnce, isLoadingUsers, fetchUsers]);

  // Set ready once we have basic data - don't block on session checks
  useEffect(() => {
    if (isAdmin && (users.length > 0 || fetchedOnce || !isLoadingUsers)) {
      console.log("UserManagement: Data is ready");
      setReady(true);
    }
  }, [users.length, fetchedOnce, isLoadingUsers, isAdmin]);

  // Refresh user list when dialog is closed
  useEffect(() => {
    if (!isDialogOpen && isAdmin && fetchedOnce && !isLoadingUsers) {
      const refreshTimeout = setTimeout(() => {
        console.log("Dialog closed, refreshing user list");
        fetchUsers();
      }, 500);
      
      return () => clearTimeout(refreshTimeout);
    }
  }, [isDialogOpen, isAdmin, fetchedOnce, isLoadingUsers, fetchUsers]);

  // CRITICAL FIX: Memoize callbacks to prevent unnecessary re-renders
  const handleEditUser = useCallback((user: User) => {
    handleOpenDialog(true, user);
  }, [handleOpenDialog]);

  const handleDeleteUserConfirm = useCallback((userId: string) => {
    confirmDeleteUser(userId);
  }, [confirmDeleteUser]);

  const handleResetPasswordCallback = useCallback((userId: string, email: string) => {
    handleResetPassword(userId, email);
  }, [handleResetPassword]);

  const handleManualResetCallback = useCallback((userId: string, email: string) => {
    openManualReset(userId, email);
  }, [openManualReset]);

  // Remove the overly aggressive periodic refresh that was causing constant refreshes

  return {
    users,
    properties,
    currentUser,
    isAdmin,
    isLoading: (isLoading || isLoadingUsers || !ready) && isAdmin,
    fetchError,
    isDialogOpen,
    setIsDialogOpen,
    isEditMode,
    newUser,
    selectedUser,
    currentPage,
    totalPages,
    USERS_PER_PAGE,
    isDeleteConfirmOpen,
    isManualResetOpen,
    setIsDeleteConfirmOpen,
    handleOpenDialog,
    handleUserChange,
    handlePropertySelection,
    handleSaveUser,
    handleResetPassword: handleResetPasswordCallback,
    handleEditUser,
    confirmDeleteUser: handleDeleteUserConfirm,
    handleDeleteUser,
    openManualReset: handleManualResetCallback,
    ManualResetDialog,
    handlePageChange,
    fetchUsers,
    ready,
    isPreparingDialog
  };
};
