
import { useState } from 'react';
import { User, UserRole } from '@/types/user';

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
    handlePropertySelection
  };
};

export type { NewUserFormState };
