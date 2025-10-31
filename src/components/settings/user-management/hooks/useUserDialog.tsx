
import { useState } from 'react';
import { User, UserRole } from '@/types/user';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

interface NewUserFormState {
  name: string;
  email: string;
  role: UserRole;
  assignedProperties: string[];
}

export const useUserDialog = () => {
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
      console.log('🚀 Pre-validating session before opening user invitation dialog...');
      
      // Add timeout protection for session check to prevent hanging
      const sessionCheckPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Session check timeout')), 5000)
      );
      
      const { data: { session }, error } = await Promise.race([
        sessionCheckPromise,
        timeoutPromise
      ]).catch((err) => {
        console.error('❌ Session check failed or timed out:', err);
        return { data: { session: null }, error: err };
      }) as any;
      
      if (error || !session) {
        console.error('❌ No valid session found:', error);
        toast.error(error?.message?.includes('timeout') 
          ? 'Session check timed out. Please try again.' 
          : 'Session expired. Please refresh the page and try again.');
        return;
      }
      
      console.log('✅ Session validated successfully:', {
        hasSession: !!session,
        hasAccessToken: !!session.access_token,
        userEmail: session.user?.email
      });
      
      // Session is valid, proceed with opening dialog
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
      
      // Only open dialog after session validation succeeds
      setIsDialogOpen(true);
      console.log('✅ User invitation dialog opened with valid session');
      
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
