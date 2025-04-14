
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, User } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserContext } from '@/contexts/UserContext';

export const UserMenu = () => {
  const navigate = useNavigate();
  const { currentUser, isAdmin, signOut } = useUserContext();
  
  const userInitials = currentUser?.name 
    ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : 'U';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-8 w-8 cursor-pointer">
          <AvatarImage src="/placeholder.svg" />
          <AvatarFallback>{userInitials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center justify-start p-2">
          <div className="flex flex-col space-y-1 leading-none">
            {currentUser && (
              <>
                <p className="font-medium">{currentUser.name}</p>
                <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                <p className="text-xs text-muted-foreground">Role: {currentUser.role}</p>
              </>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        
        {/* Add Settings link in dropdown menu for easier access */}
        {isAdmin() && (
          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={() => navigate('/settings')}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem 
          className="cursor-pointer"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
