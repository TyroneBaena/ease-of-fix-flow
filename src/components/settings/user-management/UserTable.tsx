
import React from 'react';
import { User } from '@/types/user';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Edit, Trash2 } from 'lucide-react';

interface UserTableProps {
  users: User[];
  currentUser: User | null;
  isLoading: boolean;
  onEditUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
}

const UserTable: React.FC<UserTableProps> = ({ 
  users, 
  currentUser, 
  isLoading, 
  onEditUser, 
  onDeleteUser 
}) => {
  return (
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
                  onClick={() => onEditUser(user)}
                  disabled={isLoading}
                >
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDeleteUser(user.id)}
                  disabled={isLoading || user.id === currentUser?.id}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {users.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
              No users found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

export default UserTable;
