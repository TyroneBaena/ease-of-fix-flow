
import React from 'react';
import { useUserManagement } from './user-management/useUserManagement';
import UserManagementHeader from './user-management/UserManagementHeader';
import UserTable from './user-management/UserTable';
import UserFormDialog from './user-management/UserFormDialog';
import AccessDeniedMessage from './user-management/AccessDeniedMessage';
import DeleteUserDialog from './user-management/DeleteUserDialog';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";

const UserManagement = () => {
  const {
    users,
    properties,
    currentUser,
    isAdmin,
    isLoading,
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
  } = useUserManagement();
  
  // If not admin, show access denied message
  if (!isAdmin) {
    return <AccessDeniedMessage />;
  }
  
  // Show loading state with timeout indicator
  if (isLoading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-600 mb-2">Loading user data...</p>
        <p className="text-sm text-gray-500">This may take a few moments</p>
      </div>
    );
  }
  
  // Show error state with retry button and more detailed error
  if (fetchError) {
    return (
      <div className="p-4">
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertTitle className="mb-2">Failed to load users</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>There was an error loading the user data: {fetchError.message || 'Unknown error'}</p>
            <p className="text-sm opacity-80">This might be due to database permissions or connection issues.</p>
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button 
            onClick={() => fetchUsers()} 
            variant="outline"
            className="mt-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </>
            )}
          </Button>
          {users.length > 0 && (
            <Button 
              variant="default" 
              className="mt-2"
            >
              Continue with cached data
            </Button>
          )}
        </div>
      </div>
    );
  }
  
  // Show empty state if no users but no error
  if (users.length === 0 && !isLoading && !fetchError) {
    return (
      <div className="p-4">
        <UserManagementHeader onInviteUser={() => handleOpenDialog()} />
        <div className="flex flex-col items-center justify-center p-8 border rounded-md mt-6 bg-gray-50">
          <p className="text-gray-600 mb-2">No users found</p>
          <Button 
            onClick={() => handleOpenDialog()} 
            variant="default"
            className="mt-2"
          >
            Add your first user
          </Button>
        </div>
      </div>
    );
  }
  
  // Regular state with users loaded
  return (
    <div>
      <UserManagementHeader onInviteUser={() => handleOpenDialog()} />
      
      <UserTable 
        users={users}
        currentUser={currentUser}
        isLoading={isLoading}
        onEditUser={(user) => handleOpenDialog(true, user)}
        onDeleteUser={confirmDeleteUser}
        onResetPassword={handleResetPassword}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        usersPerPage={USERS_PER_PAGE}
      />
      
      <UserFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        isEditMode={isEditMode}
        user={newUser}
        selectedUserId={selectedUser?.id}
        currentUserId={currentUser?.id}
        properties={properties}
        isLoading={isLoading}
        onUserChange={handleUserChange}
        onPropertySelection={handlePropertySelection}
        onSave={handleSaveUser}
      />
      
      <DeleteUserDialog
        isOpen={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        isLoading={isLoading}
        onConfirmDelete={handleDeleteUser}
      />
    </div>
  );
};

export default UserManagement;
