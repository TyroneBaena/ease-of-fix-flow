
import React from 'react';
import { useUserManagement } from './user-management/useUserManagement';
import UserManagementHeader from './user-management/UserManagementHeader';
import UserTable from './user-management/UserTable';
import UserFormDialog from './user-management/UserFormDialog';
import AccessDeniedMessage from './user-management/AccessDeniedMessage';
import DeleteUserDialog from './user-management/DeleteUserDialog';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

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
    openManualReset,
    ManualResetDialog,
    confirmDeleteUser,
    handleDeleteUser,
    handlePageChange,
    fetchUsers
  } = useUserManagement();
  
  // If not admin, show access denied message
  if (!isAdmin) {
    return <AccessDeniedMessage />;
  }
  
  // Show loading state
  if (isLoading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-600">Loading user data...</p>
      </div>
    );
  }
  
  // Show error state with retry button
  if (fetchError) {
    return (
      <div className="p-4">
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Failed to load users</AlertTitle>
          <AlertDescription>
            There was an error loading the user data. Please try again.
          </AlertDescription>
        </Alert>
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
      </div>
    );
  }
  
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
        onManualResetPassword={openManualReset}
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
      
      <ManualResetDialog />
    </div>
  );
};

export default UserManagement;
