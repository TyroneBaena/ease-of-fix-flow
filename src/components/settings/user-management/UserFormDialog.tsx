
import React from 'react';
import { User, UserRole } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Check } from 'lucide-react';

interface Property {
  id: string;
  name: string;
}

interface UserFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isEditMode: boolean;
  user: {
    name: string;
    email: string;
    role: UserRole;
    assignedProperties: string[];
  };
  selectedUserId?: string;
  currentUserId?: string | null;
  properties: Property[];
  isLoading: boolean;
  onUserChange: (field: string, value: any) => void;
  onPropertySelection: (propertyId: string) => void;
  onSave: () => Promise<void>;
}

const UserFormDialog: React.FC<UserFormDialogProps> = ({
  isOpen,
  onOpenChange,
  isEditMode,
  user,
  selectedUserId,
  currentUserId,
  properties,
  isLoading,
  onUserChange,
  onPropertySelection,
  onSave
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit User' : 'Invite New User'}</DialogTitle>
        </DialogHeader>
        
        {!isEditMode && (
          <Alert className="bg-blue-50 text-blue-800 border-blue-200 mb-4">
            <Mail className="h-4 w-4" />
            <AlertDescription>
              An invitation email will be sent to the user with instructions to set up their account.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">Name</label>
            <Input 
              id="name"
              value={user.name}
              onChange={(e) => onUserChange('name', e.target.value)}
              placeholder="Enter name"
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input 
              id="email"
              type="email"
              value={user.email}
              onChange={(e) => onUserChange('email', e.target.value)}
              placeholder="Enter email address"
              disabled={isLoading || (isEditMode && selectedUserId === currentUserId)}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-medium">Role</label>
            <Select 
              value={user.role}
              onValueChange={(value: UserRole) => onUserChange('role', value)}
              disabled={isLoading || (isEditMode && selectedUserId === currentUserId)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {user.role === 'manager' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Assigned Properties</label>
              <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-2">
                {properties.map(property => (
                  <div key={property.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`property-${property.id}`}
                      checked={user.assignedProperties.includes(property.id)}
                      onCheckedChange={() => onPropertySelection(property.id)}
                      disabled={isLoading}
                    />
                    <label 
                      htmlFor={`property-${property.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {property.name}
                    </label>
                  </div>
                ))}
                {properties.length === 0 && (
                  <p className="text-sm text-gray-500 p-2">No properties available</p>
                )}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={onSave} 
            disabled={isLoading}
            className="flex items-center"
          >
            {isLoading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2"></span>
            ) : isEditMode ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            {isEditMode ? 'Update User' : 'Send Invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserFormDialog;
