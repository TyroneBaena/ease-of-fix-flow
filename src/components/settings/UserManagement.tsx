
import React, { useEffect } from 'react';
import { useUserManagement } from './user-management/useUserManagement';
import UserManagementHeader from './user-management/UserManagementHeader';
import UserTable from './user-management/UserTable';
import UserFormDialog from './user-management/UserFormDialog';
import AccessDeniedMessage from './user-management/AccessDeniedMessage';
import DeleteUserDialog from './user-management/DeleteUserDialog';

const UserManagement = () => {
  const {
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
  } = useUserManagement();
  
  // Force a user refresh when component mounts
  useEffect(() => {
    if (isAdmin()) {
      fetchUsers();
    }
  }, []);
  
  if (!isAdmin()) {
    return <AccessDeniedMessage />;
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
