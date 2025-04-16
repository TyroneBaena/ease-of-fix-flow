
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
  const { addUser, updateUser, removeUser, resetPassword } = useUserContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

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
      toast.success(`Password reset email sent to ${email}`);
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
      
      // If we deleted the last user on the current page, go back one page
      // This calculation needs the users array which we don't have here
      // The logic will be handled in the main hook
      
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
