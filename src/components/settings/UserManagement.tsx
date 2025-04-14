
import React, { useState, useEffect } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { usePropertyContext } from '@/contexts/PropertyContext';
import { toast } from "sonner";
import { User, UserRole } from '@/types/user';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import UserManagementHeader from './user-management/UserManagementHeader';
import UserTable from './user-management/UserTable';
import UserFormDialog from './user-management/UserFormDialog';
import AccessDeniedMessage from './user-management/AccessDeniedMessage';

const USERS_PER_PAGE = 5;

const UserManagement = () => {
  const { users, addUser, updateUser, removeUser, isAdmin, currentUser, fetchUsers, resetPassword } = useUserContext();
  const { properties } = usePropertyContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'manager' as UserRole,
    assignedProperties: [] as string[]
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  
  const totalPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE));
  
  // Force a user refresh when component mounts
  useEffect(() => {
    if (isAdmin()) {
      fetchUsers();
    }
  }, []);
  
  const handlePageChange = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };
  
  const handleOpenDialog = (edit: boolean = false, user?: User) => {
    if (edit && user) {
      setIsEditMode(true);
      setSelectedUser(user);
      setNewUser({
        name: user.name,
        email: user.email,
        role: user.role,
        assignedProperties: user.assignedProperties || []
      });
    } else {
      setIsEditMode(false);
      setSelectedUser(null);
      setNewUser({
        name: '',
        email: '',
        role: 'manager',
        assignedProperties: []
      });
    }
    setIsDialogOpen(true);
  };
  
  const handleUserChange = (field: string, value: any) => {
    setNewUser(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handlePropertySelection = (propertyId: string) => {
    setNewUser(prev => {
      const assignedProperties = [...(prev.assignedProperties || [])];
      
      if (assignedProperties.includes(propertyId)) {
        return {
          ...prev,
          assignedProperties: assignedProperties.filter(id => id !== propertyId)
        };
      } else {
        return {
          ...prev,
          assignedProperties: [...assignedProperties, propertyId]
        };
      }
    });
  };

  const handleSaveUser = async () => {
    if (!newUser.name || !newUser.email) {
      toast.error("Name and email are required");
      return;
    }
    
    try {
      setIsLoading(true);
      console.log("Starting user save operation:", isEditMode ? "update" : "invite");
      
      if (isEditMode && selectedUser) {
        const updatedUser: User = {
          ...selectedUser,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          assignedProperties: newUser.role === 'manager' ? newUser.assignedProperties : []
        };
        console.log("Updating user:", updatedUser);
        await updateUser(updatedUser);
        toast.success(`User ${updatedUser.name} updated successfully`);
      } else {
        console.log("Adding new user:", {
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          assignedPropertiesCount: newUser.assignedProperties.length
        });
        
        const result = await addUser(newUser.email, newUser.name, newUser.role, newUser.assignedProperties);
        console.log("Add user result:", result);
        
        if (result.emailSent) {
          if (result.testMode) {
            toast.success(
              `User ${newUser.name} created successfully. Test email sent to developer account.`,
              {
                description: "To send to real email addresses, verify a domain in Resend.",
                duration: 8000
              }
            );
          } else {
            toast.success(`Invitation sent to ${newUser.email}`);
          }
        } else {
          const errorMessage = result.emailError || "Unknown error";
          console.error("Email sending failed:", errorMessage);
          toast.error(`User created but invitation email failed to send. ${errorMessage}`);
        }
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'invite'} user: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResetPassword = async (userId: string, email: string) => {
    try {
      setIsLoading(true);
      await resetPassword(userId, email);
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error(`Failed to reset password: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const confirmDeleteUser = (userId: string) => {
    setUserToDelete(userId);
    setIsDeleteConfirmOpen(true);
  };
  
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      setIsLoading(true);
      await removeUser(userToDelete);
      
      const remainingUsersOnPage = users.filter(user => user.id !== userToDelete).length % USERS_PER_PAGE;
      if (remainingUsersOnPage === 0 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
      
      toast.success("User removed successfully");
      setIsDeleteConfirmOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(`Failed to remove user: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
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
      
      {/* Confirmation dialog for user deletion */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user account and remove their access to the system.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground"
            >
              {isLoading ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement;
