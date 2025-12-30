
import React from 'react';
import { User } from '@/types/user';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import UserTableRow from './table/UserTableRow';
import UserTablePagination from './table/UserTablePagination';

interface UserTableProps {
  users: User[];
  currentUser: User | null;
  isLoading: boolean;
  onEditUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onResetPassword: (userId: string, email: string) => void;
  onManualResetPassword?: (userId: string, email: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  usersPerPage: number;
}

const UserTable: React.FC<UserTableProps> = ({ 
  users,
  currentUser,
  isLoading,
  onEditUser,
  onDeleteUser,
  onResetPassword,
  onManualResetPassword,
  currentPage,
  totalPages,
  onPageChange,
  usersPerPage
}) => {
  // Calculate which users to display on the current page
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const currentUsers = users.slice(startIndex, endIndex);

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Properties</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Last Logged In</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentUsers.map(user => (
            <UserTableRow
              key={user.id}
              user={user}
              currentUserId={currentUser?.id}
              isLoading={isLoading}
              onEditUser={onEditUser}
              onDeleteUser={onDeleteUser}
              onResetPassword={onResetPassword}
              onManualResetPassword={onManualResetPassword}
            />
          ))}
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                No users found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {users.length > 0 && (
        <UserTablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
};

export default UserTable;
