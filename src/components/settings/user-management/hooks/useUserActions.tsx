
import { useState } from 'react';
import { toast } from "sonner";
import { useUserContext } from '@/contexts/UserContext';
import { User } from '@/types/user';
import { NewUserFormState } from './useUserDialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Copy, Check } from "lucide-react";

export const useUserActions = (
  setIsDialogOpen: (isOpen: boolean) => void,
  isEditMode: boolean,
  selectedUser: User | null,
  newUser: NewUserFormState,
  currentPage: number,
  setCurrentPage: (page: number) => void,
  usersPerPage: number
) => {
  const { addUser, updateUser, removeUser, resetPassword, adminResetPassword, fetchUsers } = useUserContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isManualResetOpen, setIsManualResetOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [userToReset, setUserToReset] = useState<{id: string, email: string} | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSaveUser = async () => {
    if (!newUser.name || !newUser.email) {
      toast.error("Name and email are required");
      return;
    }
    
    // Reset any previous error
    setFormError(null);
    
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
          // Clear any previous form state that might be cached 
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
            setFormError(result.message || "Failed to process user");
            toast.error(result.message || "Failed to process user");
            // Do not close dialog on error so user can correct if needed
          }
        } catch (error: any) {
          console.error("Error adding user:", error);
          setFormError(`Failed to invite user: ${error.message || 'Unknown error'}`);
          toast.error(`Failed to invite user: ${error.message || 'Unknown error'}`);
        }
      }
    } catch (error: any) {
      console.error("Error saving user:", error);
      setFormError(`Failed to ${isEditMode ? 'update' : 'invite'} user: ${error.message || 'Unknown error'}`);
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
  
  const handleManualResetPassword = async () => {
    if (!userToReset) return;
    
    try {
      setIsLoading(true);
      const { id, email } = userToReset;
      
      const result = await adminResetPassword(id, email);
      
      if (result.success && result.message.includes('Password has been reset to:')) {
        // Extract temporary password from the message
        const tempPwd = result.message.split('Password has been reset to:')[1].trim();
        setTempPassword(tempPwd);
      } else {
        toast.error(result.message || 'Failed to reset password');
        setIsManualResetOpen(false);
      }
    } catch (error: any) {
      console.error("Error in manual password reset:", error);
      toast.error(`Manual password reset failed: ${error.message || 'Unknown error'}`);
      setIsManualResetOpen(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  const copyToClipboard = () => {
    if (!tempPassword) return;
    
    navigator.clipboard.writeText(tempPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Temporary password copied to clipboard");
    }).catch(err => {
      console.error('Failed to copy:', err);
      toast.error("Failed to copy password");
    });
  };
  
  const openManualReset = (userId: string, email: string) => {
    setUserToReset({ id: userId, email });
    setIsManualResetOpen(true);
    setTempPassword(null);
    setCopied(false);
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
  
  const ManualResetDialog = () => (
    <Dialog open={isManualResetOpen} onOpenChange={setIsManualResetOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manual Password Reset</DialogTitle>
          <DialogDescription>
            {tempPassword 
              ? "A temporary password has been generated. Share it with the user securely."
              : `Reset password for ${userToReset?.email}?`
            }
          </DialogDescription>
        </DialogHeader>
        
        {!tempPassword ? (
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="default"
              onClick={handleManualResetPassword}
              disabled={isLoading}
              className="mt-2 sm:mt-0"
            >
              {isLoading ? "Resetting..." : "Generate Temporary Password"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsManualResetOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </DialogFooter>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border p-4">
              <div className="font-mono text-sm">{tempPassword}</div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={copyToClipboard}
                className="ml-2"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              This temporary password will only be shown once.
            </p>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => setIsManualResetOpen(false)}
                className="mt-2"
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  return {
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
  };
};
