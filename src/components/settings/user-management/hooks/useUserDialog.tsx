
import { useState } from 'react';
import { User, UserRole } from '@/types/user';
import { toast } from '@/lib/toast';
import { Session } from '@supabase/supabase-js';

interface NewUserFormState {
  name: string;
  email: string;
  role: UserRole;
  assignedProperties: string[];
}

export const useUserDialog = (session: Session | null) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<NewUserFormState>({
    name: '',
    email: '',
    role: 'manager',
    assignedProperties: []
  });
  const [isPreparingDialog, setIsPreparingDialog] = useState(false);

  const handleOpenDialog = async (edit: boolean = false, user?: User) => {
    // Prevent multiple simultaneous calls
    if (isPreparingDialog) {
      console.log('⏳ Dialog preparation already in progress, ignoring duplicate call');
      return;
    }

    try {
      setIsPreparingDialog(true);
      console.log('🚀 Opening user invitation dialog...');
      
      // Use session from context - no need for redundant API call
      // The visibility handler already validates the session
      if (!session) {
        console.warn('⚠️ No active session found');
        // Don't block the user - let the actual API call handle auth errors
        // This provides a smoother experience
      }
      
      // Proceed with opening dialog
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
      
      // Open dialog immediately for smooth experience
      setIsDialogOpen(true);
      console.log('✅ User invitation dialog opened');
      
    } catch (error) {
      console.error('❌ Error preparing user invitation dialog:', error);
      toast.error('Failed to prepare invitation form. Please try again.');
    } finally {
      setIsPreparingDialog(false);
    }
  };
  
  const handleUserChange = (field: string, value: any) => {
    setNewUser(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handlePropertySelection = (propertyId: string) => {
    console.log('handlePropertySelection called with propertyId:', propertyId);
    setNewUser(prev => {
      const assignedProperties = [...(prev.assignedProperties || [])];
      console.log('Current assignedProperties:', assignedProperties);
      
      if (assignedProperties.includes(propertyId)) {
        console.log('Removing property from assignment');
        const newAssignedProperties = assignedProperties.filter(id => id !== propertyId);
        console.log('New assignedProperties after removal:', newAssignedProperties);
        return {
          ...prev,
          assignedProperties: newAssignedProperties
        };
      } else {
        console.log('Adding property to assignment');
        const newAssignedProperties = [...assignedProperties, propertyId];
        console.log('New assignedProperties after addition:', newAssignedProperties);
        return {
          ...prev,
          assignedProperties: newAssignedProperties
        };
      }
    });
  };

  return {
    isDialogOpen,
    setIsDialogOpen,
    isEditMode,
    selectedUser,
    newUser,
    handleOpenDialog,
    handleUserChange,
    handlePropertySelection,
    isPreparingDialog
  };
};

export type { NewUserFormState };
