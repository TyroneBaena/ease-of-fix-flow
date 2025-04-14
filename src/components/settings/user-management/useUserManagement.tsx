
import { useCallback, useMemo, useState } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { usePropertyContext } from '@/contexts/PropertyContext';
import { useUserPagination, USERS_PER_PAGE } from './hooks/useUserPagination';
import { useUserDialog } from './hooks/useUserDialog';
import { useUserActions } from './hooks/useUserActions';
import { User } from '@/types/user';

export const useUserManagement = () => {
  const { users, currentUser, fetchUsers: fetchUsersFromContext } = useUserContext();
  const { properties } = usePropertyContext();
  const [fetchCompleted, setFetchCompleted] = useState(false);
  
  // Direct check without calling functions to prevent loops
  const isAdmin = currentUser?.role === 'admin' || false;
  
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
  
  // Memoize the fetchUsers function to prevent infinite loops
  const fetchUsers = useCallback(async () => {
    if (!fetchCompleted && isAdmin) {
      console.log("Fetching users from useUserManagement");
      try {
        await fetchUsersFromContext();
        setFetchCompleted(true);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    }
  }, [fetchUsersFromContext, fetchCompleted, isAdmin]);

  return {
    users,
    properties,
    currentUser,
    isAdmin,
    isLoading,
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
