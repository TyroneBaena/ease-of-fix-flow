
import { useState, useCallback } from 'react';
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
  usersPerPage: number,
  fetchUsers: () => Promise<void>,
  users: User[]
) => {
  const { addUser, updateUser, removeUser, resetPassword, adminResetPassword } = useUserContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isManualResetOpen, setIsManualResetOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [userToReset, setUserToReset] = useState<{id: string, email: string} | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSaveUser = useCallback(async (userData?: NewUserFormState) => {
    console.log('💾 handleSaveUser called with isEditMode:', isEditMode);
    console.log('📧 userData parameter:', userData);
    console.log('📧 userData.assignedProperties:', userData?.assignedProperties);
    console.log('📧 newUser state:', newUser);
    console.log('📧 newUser.assignedProperties:', newUser.assignedProperties);
    
    // Use provided userData or fallback to state
    const userToSave = userData || newUser;
    
    console.log('📧 userToSave final:', userToSave);
    console.log('📧 userToSave.assignedProperties:', userToSave.assignedProperties);
    console.log('📧 assignedProperties count:', userToSave.assignedProperties?.length || 0);
    
    // Validation is already handled by react-hook-form, no need for additional checks
    try {
      setIsLoading(true);
      
      if (isEditMode && selectedUser) {
        const updatedUser: User = {
          ...selectedUser,
          name: userToSave.name,
          email: userToSave.email,
          role: userToSave.role,
          assignedProperties: userToSave.role === 'manager' ? userToSave.assignedProperties : []
        };
        console.log("Updating user:", updatedUser);
        console.log("User assignedProperties being saved:", updatedUser.assignedProperties);
        await updateUser(updatedUser);
        toast.success(`User ${updatedUser.name} updated successfully`, {
          description: "Changes will appear in the list shortly."
        });
        setIsDialogOpen(false);
      } else {
        // Frontend pre-check: Check if email already exists in loaded users list
        const existingUser = users.find(u => u.email.toLowerCase() === userToSave.email.toLowerCase().trim());
        if (existingUser) {
          toast.error(`A user with email ${userToSave.email} already exists.`, {
            duration: 5000,
            id: 'duplicate-email-error',
            description: "Please use a different email address."
          });
          setIsLoading(false);
          return; // Don't close dialog, let user correct the email
        }
        
        console.log("📧 Adding new user:", {
          email: userToSave.email,
          name: userToSave.name,
          role: userToSave.role,
          assignedProperties: userToSave.assignedProperties,
          assignedPropertiesCount: userToSave.assignedProperties?.length || 0
        });
        console.log("📧 Full userToSave before addUser:", JSON.stringify(userToSave, null, 2));
        
        try {
          // Clear any previous form state that might be cached 
          const result = await addUser(userToSave.email, userToSave.name, userToSave.role, userToSave.assignedProperties);
          console.log("📨 Add user result:", result);
          
          if (result.success) {
            if (result.isNewUser) {
              toast.success("Invitation sent successfully", {
                description: "The user will appear in the list shortly."
              });
            } else if (result.isExistingUserAddedToOrg) {
              toast.success(`Existing user ${result.email} has been added to your organization`, {
                description: "The user will appear in the list shortly."
              });
            } else {
              toast.success(result.message || "User processed successfully", {
                description: "The user will appear in the list shortly."
              });
            }
            
            setIsDialogOpen(false);
            
            // For test mode emails, show additional information
            if (result.testMode && result.testModeInfo) {
              setTimeout(() => {
                toast.info(result.testModeInfo);
              }, 1000);
            }
          } else {
            // This message is for failures like "user already exists"
            console.error("User creation failed:", result.message);
            
            // Check for specific duplicate email messages
            const isDuplicateEmail = result.message?.toLowerCase().includes('already exists') || 
                                     result.message?.toLowerCase().includes('already registered') ||
                                     result.message?.toLowerCase().includes('already a member');
            
            if (isDuplicateEmail) {
              toast.error(result.message, { 
                duration: 5000,
                id: 'duplicate-email-error',
                description: "Please try with a different email address."
              });
            } else {
              toast.error(result.message || "Unable to send invitation. Please try again.", {
                duration: 5000
              });
            }
            // Do not close dialog on error so user can correct if needed
          }
        } catch (error: any) {
          console.error("Error adding user:", error);
          // Provide a user-friendly error message
          const userMessage = "Unable to send invitation at this time. Please try again.";
          toast.error(userMessage);
        }
      }
    } catch (error: any) {
      console.error("Error saving user:", error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'invite'} user: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [isEditMode, selectedUser, newUser, updateUser, setIsDialogOpen, fetchUsers, addUser, users]);
  
  const handleResetPassword = useCallback(async (userId: string, email: string) => {
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
  }, [resetPassword]);
  
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
  
  const openManualReset = useCallback((userId: string, email: string) => {
    setUserToReset({ id: userId, email });
    setIsManualResetOpen(true);
    setTempPassword(null);
    setCopied(false);
  }, []);
  
  const confirmDeleteUser = useCallback((userId: string) => {
    setUserToDelete(userId);
    setIsDeleteConfirmOpen(true);
  }, []);
  
  const handleDeleteUser = useCallback(async () => {
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
  }, [userToDelete, removeUser, fetchUsers]);
  
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
