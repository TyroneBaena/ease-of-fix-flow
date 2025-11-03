
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
  
  // Function to safely fetch users - moved here to be available to useUserActions
  const fetchUsers = useCallback(async () => {
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
    } catch (error) {
      console.error("Error fetching users:", error);
      setFetchError(error as Error);
      toast.error("Failed to load users. Please try again.");
    } finally {
      setIsLoadingUsers(false);
    }
  }, [isAdmin, fetchUsersFromContext]);

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

  // Fetch users when component mounts - simplified approach
  useEffect(() => {
    if (isAdmin && !fetchedOnce && !isLoadingUsers) {
      console.log("Initial fetch for admin user");
      fetchUsers();
    }
  }, [isAdmin]); // Only depend on isAdmin to avoid loops

  // Set ready once we have basic data - don't block on session checks
  useEffect(() => {
    if (isAdmin && (users.length > 0 || fetchedOnce || !isLoadingUsers)) {
      console.log("UserManagement: Data is ready");
      setReady(true);
    }
  }, [users.length, fetchedOnce, isLoadingUsers, isAdmin]);

  // Refresh user list when dialog is closed after successful operation - but only once
  useEffect(() => {
    if (!isDialogOpen && isAdmin && fetchedOnce && !isLoadingUsers) {
      // Add a small delay to ensure any pending operations complete
      const refreshTimeout = setTimeout(() => {
        console.log("Dialog closed, refreshing user list");
        fetchUsers();
      }, 500);
      
      return () => clearTimeout(refreshTimeout);
    }
  }, [isDialogOpen, isAdmin]);

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
    handleResetPassword,
    openManualReset,
    ManualResetDialog,
    confirmDeleteUser,
    handleDeleteUser,
    handlePageChange,
    fetchUsers,
    ready,
    isPreparingDialog
  };
};
