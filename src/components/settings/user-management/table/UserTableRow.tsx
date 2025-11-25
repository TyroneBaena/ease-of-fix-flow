
import React, { useState } from 'react';
import { User } from '@/types/user';
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { MoreHorizontal, Pencil, Trash2, RotateCw, Key } from "lucide-react";

interface UserTableRowProps {
  user: User;
  currentUserId: string | undefined;
  isLoading: boolean;
  onEditUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onResetPassword: (userId: string, email: string) => void;
  onManualResetPassword?: (userId: string, email: string) => void;
}

// CRITICAL FIX: Only compare data props, NOT callback functions
// Comparing callbacks causes unnecessary re-renders and dropdown flickering
const arePropsEqual = (prevProps: UserTableRowProps, nextProps: UserTableRowProps) => {
  const prevUser = prevProps.user;
  const nextUser = nextProps.user;
  
  return (
    prevUser.id === nextUser.id &&
    prevUser.name === nextUser.name &&
    prevUser.email === nextUser.email &&
    prevUser.role === nextUser.role &&
    prevUser.createdAt === nextUser.createdAt &&
    JSON.stringify(prevUser.assignedProperties) === JSON.stringify(nextUser.assignedProperties) &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.isLoading === nextProps.isLoading
    // REMOVED: Callback function comparisons - they cause flickering
  );
};

const UserTableRow: React.FC<UserTableRowProps> = ({ 
  user, 
  currentUserId, 
  isLoading,
  onEditUser,
  onDeleteUser,
  onResetPassword,
  onManualResetPassword
}) => {
  // CRITICAL FIX: Local state to control dropdown - prevents flickering
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const isSelf = user.id === currentUserId;
  const canEditUser = !isSelf || (isSelf && user.role === 'admin');
  
  const formattedDate = user.createdAt 
    ? format(new Date(user.createdAt), 'MMM d, yyyy')
    : 'N/A';
  
  const propertyCount = user.assignedProperties?.length || 0;
  
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case 'manager': return "bg-green-100 text-green-800 hover:bg-green-200";
      case 'contractor': return "bg-amber-100 text-amber-800 hover:bg-amber-200";
      default: return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  return (
    <TableRow key={user.id} className={isSelf ? "bg-slate-50" : ""}>
      <TableCell className="font-medium">
        {user.name}
        {isSelf && <span className="ml-2 text-xs text-gray-500">(You)</span>}
      </TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>
        <Badge className={`${getRoleBadgeColor(user.role)}`}>
          {user.role}
        </Badge>
      </TableCell>
      <TableCell>
        {user.role === 'manager' ? (
          <Badge variant="outline">{propertyCount}</Badge>
        ) : (
          <span className="text-gray-500">-</span>
        )}
      </TableCell>
      <TableCell>{formattedDate}</TableCell>
      <TableCell className="text-right">
        <DropdownMenu 
          modal={false} 
          open={dropdownOpen} 
          onOpenChange={setDropdownOpen}
        >
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              disabled={isLoading}
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="z-[100] bg-background border shadow-md"
            onInteractOutside={() => setDropdownOpen(false)}
          >
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                console.log('🖱️ Edit button clicked for user:', user);
                console.log('🖱️ User object:', user);
                console.log('🖱️ User assignedProperties:', user.assignedProperties);
                console.log('🖱️ User assignedProperties count:', user.assignedProperties?.length || 0);
                onEditUser(user);
                setDropdownOpen(false);
              }}
              disabled={!canEditUser}
              className="cursor-pointer"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit User
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onResetPassword(user.id, user.email);
                setDropdownOpen(false);
              }}
              className="cursor-pointer"
            >
              <RotateCw className="mr-2 h-4 w-4" />
              Email Password Reset
            </DropdownMenuItem>
            
            {onManualResetPassword && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onManualResetPassword(user.id, user.email);
                  setDropdownOpen(false);
                }}
                className="cursor-pointer"
              >
                <Key className="mr-2 h-4 w-4" />
                Manual Password Reset
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDeleteUser(user.id);
                setDropdownOpen(false);
              }}
              disabled={isSelf}
              className={`cursor-pointer ${isSelf ? 'text-gray-400' : 'text-red-600 focus:bg-red-50 focus:text-red-600'}`}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

export default React.memo(UserTableRow, arePropsEqual);
