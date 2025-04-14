
import { useCallback, useMemo, useState, useEffect } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import { useUserPagination, USERS_PER_PAGE } from './hooks/useUserPagination';
import { useUserDialog } from './hooks/useUserDialog';
import { useUserActions } from './hooks/useUserActions';
import { User } from '@/types/user';
import { toast } from 'sonner';

export const useUserManagement = () => {
  const { users, currentUser, isAdmin, fetchUsers: fetchUsersFromContext } = useUserContext();
  const { properties } = usePropertyContext();
  const [fetchedOnce, setFetchedOnce] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [fetchError, setFetchError] = useState<Error | null>(null);
  const [loadingStabilizer, setLoadingStabilizer] = useState(true);
  
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
    handlePropertySelection
  } = useUserDialog();
  
  // Set up user actions
  const {
    isLoading,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    handleSaveUser,
    handleResetPassword,
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
    USERS_PER_PAGE
  );
  
  // Function to safely fetch users
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
    } catch (error) {
      console.error("Error fetching users:", error);
      setFetchError(error as Error);
      toast.error("Failed to load users. Please try again.");
    } finally {
      setIsLoadingUsers(false);
    }
  }, [isAdmin, fetchUsersFromContext]);

  // Use useEffect for initial fetch
  useEffect(() => {
    if (isAdmin && !fetchedOnce && !isLoadingUsers) {
      fetchUsers();
    }
  }, [isAdmin, fetchedOnce, isLoadingUsers, fetchUsers]);

  // Stabilize loading state to prevent flicker
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingStabilizer(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return {
    users,
    properties,
    currentUser,
    isAdmin,
    isLoading: (isLoading || isLoadingUsers || loadingStabilizer) && isAdmin,
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
    setIsDeleteConfirmOpen,
    handleOpenDialog,
    handleUserChange,
    handlePropertySelection,
    handleSaveUser,
    handleResetPassword,
    confirmDeleteUser,
    handleDeleteUser,
    handlePageChange,
    fetchUsers
  };
};
