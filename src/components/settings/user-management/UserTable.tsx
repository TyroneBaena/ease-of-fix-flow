
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface UserTableProps {
  users: User[];
  currentUser: User | null;
  isLoading: boolean;
  onEditUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  // Pagination props
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
  currentPage,
  totalPages,
  onPageChange,
  usersPerPage
}) => {
  // Calculate which users to display on the current page
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);

  // Generate an array of page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    // Always show first page
    if (currentPage > 2) {
      pages.push(1);
      if (currentPage > 3) {
        pages.push('ellipsis');
      }
    }
    
    // Show one page before current if it exists
    if (currentPage > 1) {
      pages.push(currentPage - 1);
    }
    
    // Show current page
    pages.push(currentPage);
    
    // Show one page after current if it exists
    if (currentPage < totalPages) {
      pages.push(currentPage + 1);
    }
    
    // Always show last page
    if (currentPage < totalPages - 1) {
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <div>
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
          {currentUsers.map(user => (
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

      {/* Only show pagination if we have users */}
      {users.length > 0 && (
        <div className="mt-4">
          <Pagination>
            <PaginationContent>
              {/* Previous page button */}
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => onPageChange(currentPage - 1)} 
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  href="#" 
                />
              </PaginationItem>

              {/* Page numbers */}
              {getPageNumbers().map((page, index) => (
                <PaginationItem key={index}>
                  {page === 'ellipsis' ? (
                    <PaginationItem>
                      <PaginationLink href="#" onClick={(e) => e.preventDefault()}>
                        ...
                      </PaginationLink>
                    </PaginationItem>
                  ) : (
                    <PaginationLink 
                      href="#" 
                      isActive={page === currentPage}
                      onClick={(e) => {
                        e.preventDefault(); 
                        onPageChange(page as number);
                      }}
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              {/* Next page button */}
              <PaginationItem>
                <PaginationNext 
                  onClick={() => onPageChange(currentPage + 1)} 
                  className={currentPage === totalPages || totalPages === 0 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  href="#" 
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default UserTable;
