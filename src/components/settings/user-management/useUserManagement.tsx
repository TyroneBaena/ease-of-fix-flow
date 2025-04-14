
import { useState } from 'react';
import { toast } from "sonner";
import { useUserContext } from '@/contexts/UserContext';
import { usePropertyContext } from '@/contexts/PropertyContext';
import { User, UserRole } from '@/types/user';

interface NewUserFormState {
  name: string;
  email: string;
  role: UserRole;
  assignedProperties: string[];
}

export const useUserManagement = () => {
  const { users, addUser, updateUser, removeUser, isAdmin, currentUser, fetchUsers, resetPassword } = useUserContext();
  const { properties } = usePropertyContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<NewUserFormState>({
    name: '',
    email: '',
    role: 'manager',
    assignedProperties: []
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  
  const USERS_PER_PAGE = 5;
  const totalPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE));
  
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
    handlePageChange
  };
};
