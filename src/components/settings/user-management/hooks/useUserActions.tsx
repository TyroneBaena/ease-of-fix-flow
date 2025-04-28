
import { useState } from 'react';
import { toast } from "sonner";
import { useUserContext } from '@/contexts/UserContext';
import { User } from '@/types/user';
import { NewUserFormState } from './useUserDialog';

export const useUserActions = (
  setIsDialogOpen: (isOpen: boolean) => void,
  isEditMode: boolean,
  selectedUser: User | null,
  newUser: NewUserFormState,
  currentPage: number,
  setCurrentPage: (page: number) => void,
  usersPerPage: number
) => {
  const { addUser, updateUser, removeUser, resetPassword, fetchUsers } = useUserContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const handleSaveUser = async () => {
    if (!newUser.name || !newUser.email) {
      toast.error("Name and email are required");
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email)) {
      toast.error("Please enter a valid email address");
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
        setIsDialogOpen(false);
      } else {
        console.log("Adding new user:", {
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          assignedPropertiesCount: newUser.assignedProperties.length
        });
        
        try {
          const result = await addUser(newUser.email, newUser.name, newUser.role, newUser.assignedProperties);
          console.log("Add user result:", result);
          
          if (result.success) {
            if (result.isNewUser) {
              toast.success("User created successfully");
            } else {
              toast.success(result.message || "User processed successfully");
            }
            
            setIsDialogOpen(false);
            
            // For test mode emails, show additional information
            if (result.testMode && result.testModeInfo) {
              setTimeout(() => {
                toast.info(result.testModeInfo);
              }, 1000);
            }
            
            // Force refresh the user list after successful adding
            await fetchUsers();
          } else {
            // This message is for failures like "user already exists"
            console.error("User creation failed:", result.message);
            toast.error(result.message || "Failed to process user");
            // Do not close dialog on error so user can correct if needed
          }
        } catch (error: any) {
          console.error("Error adding user:", error);
          toast.error(`Failed to invite user: ${error.message || 'Unknown error'}`);
        }
      }
    } catch (error: any) {
      console.error("Error saving user:", error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'invite'} user: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResetPassword = async (userId: string, email: string) => {
    try {
      setIsLoading(true);
      const result = await resetPassword(userId, email);
      
      if (result.success) {
        toast.success(`Password reset email sent to ${email}`);
      } else {
        toast.error(`Failed to send password reset: ${result.message}`);
      }
    } catch (error: any) {
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
      
      toast.success("User removed successfully");
      setIsDeleteConfirmOpen(false);
      setUserToDelete(null);
      
      // Update current page if needed after deletion
      await fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(`Failed to remove user: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    handleSaveUser,
    handleResetPassword,
    confirmDeleteUser,
    handleDeleteUser,
    userToDelete
  };
};
