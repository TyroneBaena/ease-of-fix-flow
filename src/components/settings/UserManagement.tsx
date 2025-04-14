
import React, { useState } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { usePropertyContext } from '@/contexts/PropertyContext';
import { toast } from "sonner";
import { User, UserRole } from '@/types/user';

// Import the new components
import UserManagementHeader from './user-management/UserManagementHeader';
import UserTable from './user-management/UserTable';
import UserFormDialog from './user-management/UserFormDialog';
import AccessDeniedMessage from './user-management/AccessDeniedMessage';

const USERS_PER_PAGE = 5;

const UserManagement = () => {
  const { users, addUser, updateUser, removeUser, isAdmin, currentUser } = useUserContext();
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  
  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE));
  
  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    // Ensure page number is within valid range
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
          toast.success(`Invitation sent to ${newUser.email}`);
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
  
  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser?.id) {
      toast.error("You cannot delete your own account");
      return;
    }
    
    try {
      setIsLoading(true);
      await removeUser(userId);
      
      // Check if we need to go back a page (if this was the last user on the page)
      const remainingUsersOnPage = users.filter(user => user.id !== userId).length % USERS_PER_PAGE;
      if (remainingUsersOnPage === 0 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
      
      toast.success("User removed successfully");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(`Failed to remove user: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Only admin can access user management
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
        onDeleteUser={handleDeleteUser}
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
    </div>
  );
};

export default UserManagement;
