import React, { useState } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { usePropertyContext } from '@/contexts/PropertyContext';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Trash2, Edit, Check } from 'lucide-react';
import { User, UserRole } from '@/types/user';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

const UserManagement = () => {
  const { users, addUser, updateUser, removeUser, isAdmin, currentUser } = useUserContext();
  const { properties } = usePropertyContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'manager' as UserRole,
    assignedProperties: [] as string[]
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
  
  const handleSaveUser = async () => {
    if (!newUser.name || !newUser.email) {
      toast.error("Name and email are required");
      return;
    }
    
    try {
      if (isEditMode && selectedUser) {
        const updatedUser: User = {
          ...selectedUser,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          assignedProperties: newUser.role === 'manager' ? newUser.assignedProperties : undefined
        };
        await updateUser(updatedUser);
      } else {
        await addUser(newUser.email, newUser.name, newUser.role, newUser.assignedProperties);
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error("Failed to save user");
    }
  };
  
  const handleDeleteUser = (userId: string) => {
    if (userId === currentUser?.id) {
      toast.error("You cannot delete your own account");
      return;
    }
    removeUser(userId);
    toast.success("User removed successfully");
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
  
  if (!isAdmin()) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-gray-500">You don't have permission to access user management.</p>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">User Management</h2>
        <Button onClick={() => handleOpenDialog()} className="flex items-center">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Properties</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <span className={`capitalize px-2 py-1 rounded-full text-xs ${
                  user.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }`}>
                  {user.role}
                </span>
              </TableCell>
              <TableCell>
                {user.role === 'admin' ? (
                  <span className="text-gray-500">All Properties</span>
                ) : (
                  <span>
                    {user.assignedProperties?.length || 0} properties
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(true, user)}
                    disabled={user.id === currentUser?.id}
                  >
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteUser(user.id)}
                    disabled={user.id === currentUser?.id}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit User' : 'Invite New User'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Name</label>
              <Input 
                id="name"
                value={newUser.name}
                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                placeholder="Enter name"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input 
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                placeholder="Enter email address"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium">Role</label>
              <Select 
                value={newUser.role}
                onValueChange={(value: UserRole) => setNewUser({...newUser, role: value})}
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
            
            {newUser.role === 'manager' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Assigned Properties</label>
                <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-2">
                  {properties.map(property => (
                    <div key={property.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`property-${property.id}`}
                        checked={newUser.assignedProperties.includes(property.id)}
                        onCheckedChange={() => handlePropertySelection(property.id)}
                      />
                      <label 
                        htmlFor={`property-${property.id}`}
                        className="text-sm"
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
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveUser}>
              {isEditMode ? 'Update User' : 'Invite User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
