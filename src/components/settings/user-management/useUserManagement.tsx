
import { useCallback, useMemo, useState, useEffect } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { usePropertyContext } from '@/contexts/PropertyContext';
import { useUserPagination, USERS_PER_PAGE } from './hooks/useUserPagination';
import { useUserDialog } from './hooks/useUserDialog';
import { useUserActions } from './hooks/useUserActions';
import { User } from '@/types/user';

export const useUserManagement = () => {
  const { users, currentUser, fetchUsers: fetchUsersFromContext } = useUserContext();
  const { properties } = usePropertyContext();
  const [fetchedOnce, setFetchedOnce] = useState(false);
  
  // Use direct property access without function calls
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
  
  // Use useEffect for initial fetch instead of a callback
  useEffect(() => {
    // Only fetch once and only if admin and not already fetched
    if (isAdmin && !fetchedOnce) {
      console.log("Initial fetch of users from useUserManagement useEffect");
      const doFetch = async () => {
        try {
          await fetchUsersFromContext();
          setFetchedOnce(true);
        } catch (error) {
          console.error("Error fetching users:", error);
        }
      };
      
      doFetch();
    }
  }, [isAdmin, fetchedOnce, fetchUsersFromContext]);

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
    fetchUsers: () => {} // Empty function to prevent any manual fetching
  };
};
