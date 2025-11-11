
import { useCallback, useState, useEffect } from 'react';
import { useSimpleAuth } from '@/contexts/UnifiedAuthContext';
import { usePropertyContext } from '@/contexts/property';
import { useUserPagination, USERS_PER_PAGE } from './hooks/useUserPagination';
import { useUserDialog } from './hooks/useUserDialog';
import { useUserActions } from './hooks/useUserActions';
import { User } from '@/types/user';
import { useSettingsUsers } from '@/hooks/settings/useSettingsUsers';

/**
 * v80.0 - Updated to use React Query hook for User Management
 * 
 * FIXES TWO ISSUES:
 * 1. Multiple API calls on tab click - React Query deduplication
 * 2. No fetch on tab return - React Query refetchOnWindowFocus
 */

export const useUserManagement = () => {
  const { currentUser, isAdmin, session } = useSimpleAuth();
  const { properties } = usePropertyContext();
  const [ready, setReady] = useState(false);
  
  // v80.0: Use React Query hook for automatic refetch on window focus and deduplication
  const canFetchUsers = isAdmin;
  const { users, loading: isLoadingUsers, error: fetchError, refetch } = useSettingsUsers({ 
    enabled: canFetchUsers 
  });
  
  // Wrapper function for compatibility with existing code
  const fetchUsers = useCallback(async () => {
    console.log("🔄 v80.0 - fetchUsers - Triggering refetch via React Query");
    await refetch();
  }, [refetch]);

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
  
  // v80.0: Set ready once we have basic data
  useEffect(() => {
    if (isAdmin && (users.length > 0 || !isLoadingUsers)) {
      console.log("👥 v80.0 - UserManagement: Data is ready");
      setReady(true);
    }
  }, [users.length, isLoadingUsers, isAdmin]);

  // v80.0: Refresh user list when dialog is closed
  useEffect(() => {
    if (!isDialogOpen && isAdmin) {
      const refreshTimeout = setTimeout(() => {
        console.log("👥 v80.0 - Dialog closed, refreshing user list");
        fetchUsers();
      }, 500);
      
      return () => clearTimeout(refreshTimeout);
    }
  }, [isDialogOpen, isAdmin, fetchUsers]);

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
    // v80.0: Show loading only when actually loading AND ready state not set
    isLoading: (isLoading || (isLoadingUsers && !ready)) && isAdmin,
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
