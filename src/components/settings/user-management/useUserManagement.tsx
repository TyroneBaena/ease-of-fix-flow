
import { useCallback, useMemo, useState, useEffect } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { usePropertyContext } from '@/contexts/property';
import { useUserPagination, USERS_PER_PAGE } from './hooks/useUserPagination';
import { useUserDialog } from './hooks/useUserDialog';
import { useUserActions } from './hooks/useUserActions';
import { User } from '@/types/user';
import { toast } from 'sonner';

export const useUserManagement = () => {
  const { users, currentUser, isAdmin, fetchUsers: fetchUsersFromContext, loadingError: userContextError } = useUserContext();
  const { properties } = usePropertyContext();
  const [fetchedOnce, setFetchedOnce] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [fetchError, setFetchError] = useState<Error | null>(null);
  const [ready, setReady] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  
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
    isManualResetOpen,
    formError,
    setFormError,
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
    USERS_PER_PAGE
  );
  
  // Store formError in window for dialog component access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__formErrorForUser__ = formError;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__formErrorForUser__;
      }
    };
  }, [formError]);
  
  // Update fetchError if there's an error in the user context
  useEffect(() => {
    if (userContextError) {
      setFetchError(userContextError);
    }
  }, [userContextError]);
  
  // Clear form error when dialog is closed
  useEffect(() => {
    if (!isDialogOpen && setFormError) {
      setFormError(null);
    }
  }, [isDialogOpen, setFormError]);
  
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
      setLastRefreshTime(Date.now());
    } catch (error) {
      console.error("Error fetching users:", error);
      setFetchError(error as Error);
      toast.error("Failed to load users. Please try again.");
    } finally {
      setIsLoadingUsers(false);
    }
  }, [isAdmin, fetchUsersFromContext]);

  // Fetch users when component mounts or when needed
  useEffect(() => {
    let isMounted = true;
    
    const shouldFetch = isAdmin && (
      !fetchedOnce || 
      (Date.now() - lastRefreshTime > 60000) // Refresh if data is older than 1 minute
    ); 
    
    if (shouldFetch && !isLoadingUsers) {
      fetchUsers().then(() => {
        if (isMounted) {
          setFetchedOnce(true);
          setLastRefreshTime(Date.now());
        }
      });
    }
    
    return () => { isMounted = false };
  }, [isAdmin, fetchedOnce, isLoadingUsers, fetchUsers, lastRefreshTime]);

  // Better loading state management with retries
  useEffect(() => {
    // Primary timer to check if data is loaded
    const timer = setTimeout(() => {
      if ((users.length > 0 || fetchedOnce) && !isLoadingUsers) {
        console.log("UserManagement: Data is ready");
        setReady(true);
      } else if (isAdmin && !fetchedOnce && !isLoadingUsers) {
        console.log("UserManagement: Attempting to fetch users again");
        fetchUsers();
      }
    }, 500);
    
    // Backup timer to force ready state after a timeout
    const backupTimer = setTimeout(() => {
      if (!ready) {
        console.log("UserManagement: Backup timer triggering ready state");
        setReady(true);
      }
    }, 3000);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(backupTimer);
    };
  }, [users, fetchedOnce, isLoadingUsers, isAdmin, fetchUsers, ready]);

  // Refresh user list whenever the dialog is closed or after certain operations
  useEffect(() => {
    if (!isDialogOpen && isAdmin && fetchedOnce) {
      // Small delay to allow time for the backend to process
      const refreshTimer = setTimeout(() => {
        fetchUsers();
      }, 500);
      
      return () => {
        clearTimeout(refreshTimer);
      };
    }
  }, [isDialogOpen, isAdmin, fetchedOnce, fetchUsers]);

  // Force a refresh occasionally in case we miss updates
  useEffect(() => {
    if (!isAdmin) return;
    
    const periodicRefresh = setInterval(() => {
      if (!isLoadingUsers && !isDialogOpen) {
        console.log("UserManagement: Periodic refresh");
        fetchUsers();
      }
    }, 60000); // Refresh every minute
    
    return () => clearInterval(periodicRefresh);
  }, [isAdmin, isLoadingUsers, isDialogOpen, fetchUsers]);

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
    formError,
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
    fetchUsers
  };
};
