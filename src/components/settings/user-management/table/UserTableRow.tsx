
import React from 'react';
import { User } from '@/types/user';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from "@/components/ui/table";
import { Edit, Trash2, Key, UserCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UserTableRowProps {
  user: User;
  currentUserId: string | null | undefined;
  isLoading: boolean;
  onEditUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onResetPassword: (userId: string, email: string) => void;
}

const UserTableRow: React.FC<UserTableRowProps> = ({
  user,
  currentUserId,
  isLoading,
  onEditUser,
  onDeleteUser,
  onResetPassword
}) => {
  const formatCreationDate = (dateString: string) => {
    if (!dateString) return "Unknown";
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return "Invalid date";
    }
  };

  return (
    <TableRow key={user.id}>
      <TableCell className="font-medium flex items-center gap-2">
        <UserCircle className="h-5 w-5 text-gray-400" />
        {user.name}
      </TableCell>
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
      <TableCell>
        {formatCreationDate(user.createdAt)}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEditUser(user)}
            disabled={isLoading}
            title="Edit user"
          >
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onResetPassword(user.id, user.email)}
            disabled={isLoading}
            title="Reset password"
          >
            <Key className="h-4 w-4" />
            <span className="sr-only">Reset Password</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDeleteUser(user.id)}
            disabled={isLoading || user.id === currentUserId}
            title={user.id === currentUserId ? "Cannot delete your own account" : "Delete user"}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default UserTableRow;
