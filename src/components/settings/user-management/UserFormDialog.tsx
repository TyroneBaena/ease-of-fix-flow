
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserRole } from '@/types/user';
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Check, UserCircle } from 'lucide-react';

const userFormSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required" }).max(100, { message: "Name must be less than 100 characters" }),
  email: z.string().trim().email({ message: "Please enter a valid email address" }).max(255, { message: "Email must be less than 255 characters" }),
  role: z.enum(['admin', 'manager', 'contractor'] as const),
  assignedProperties: z.array(z.string()).default([])
});

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
  onSave: (userData?: any) => Promise<void>;
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
  const form = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      role: user.role,
      assignedProperties: user.assignedProperties || []
    }
  });

  // Update form values when dialog opens
  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: user.name,
        email: user.email,
        role: user.role,
        assignedProperties: user.assignedProperties || []
      });
    }
  }, [isOpen, user.name, user.email, user.role, user.assignedProperties, form]);

  const handleSubmit = form.handleSubmit(async (data) => {
    // Pass form data directly to onSave to avoid state timing issues
    console.log('🔍 Form submission - Full data:', data);
    console.log('🔍 Form submission - Assigned properties:', data.assignedProperties);
    console.log('🔍 Form submission - Assigned properties count:', data.assignedProperties?.length || 0);
    
    try {
      await onSave(data);
    } catch (error) {
      console.error('UserFormDialog - onSave failed:', error);
    }
  });

  const handlePropertyToggle = (propertyId: string) => {
    const currentProperties = form.getValues('assignedProperties');
    const newProperties = currentProperties.includes(propertyId)
      ? currentProperties.filter(id => id !== propertyId)
      : [...currentProperties, propertyId];
    
    form.setValue('assignedProperties', newProperties, { shouldValidate: true });
  };

  const handleSelectAllProperties = () => {
    const currentProperties = form.getValues('assignedProperties');
    const allPropertyIds = properties.map(p => p.id);
    
    // If all are selected, deselect all; otherwise select all
    const newProperties = currentProperties.length === allPropertyIds.length
      ? []
      : allPropertyIds;
    
    form.setValue('assignedProperties', newProperties, { shouldValidate: true });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UserCircle className="mr-2 h-5 w-5" />
            {isEditMode ? 'Edit User Profile' : 'Invite New User'}
          </DialogTitle>
        </DialogHeader>
        
        {!isEditMode && (
          <Alert className="bg-blue-50 text-blue-800 border-blue-200 mb-4">
            <Mail className="h-4 w-4" />
            <AlertDescription>
              An invitation email will be sent to the user with instructions to set up their account.
            </AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      placeholder="Enter full name"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      type="email"
                      placeholder="Enter email address"
                      disabled={isLoading || (isEditMode && selectedUserId === currentUserId)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role *</FormLabel>
                  <Select 
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading || (isEditMode && selectedUserId === currentUserId)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {field.value === 'admin' ? 
                      'Admins have full access to all properties and can manage users.' : 
                      'Managers can only access properties assigned to them.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {form.watch('role') === 'manager' && (
              <FormField
                control={form.control}
                name="assignedProperties"
                render={() => {
                  const assignedProperties = form.watch('assignedProperties') || [];
                  return (
                    <FormItem>
                      <FormLabel>Assigned Properties</FormLabel>
                      <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-2">
                        {properties.length > 0 ? (
                          <>
                            <div className="flex items-center space-x-2 pb-2 border-b mb-2">
                              <Checkbox 
                                id="select-all-properties"
                                checked={assignedProperties.length === properties.length && properties.length > 0}
                                onCheckedChange={handleSelectAllProperties}
                                disabled={isLoading}
                              />
                              <label 
                                htmlFor="select-all-properties"
                                className="text-sm font-medium cursor-pointer"
                              >
                                Select All ({assignedProperties.length}/{properties.length})
                              </label>
                            </div>
                            {[...properties]
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map(property => (
                              <div key={property.id} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`property-${property.id}`}
                                  checked={assignedProperties.includes(property.id)}
                                  onCheckedChange={() => handlePropertyToggle(property.id)}
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
                          </>
                        ) : (
                          <p className="text-sm text-gray-500 p-2">No properties available</p>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            )}
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default UserFormDialog;
