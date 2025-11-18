
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Plus, Settings, Menu as MenuIcon, Shield } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserContext } from '@/contexts/UnifiedAuthContext';

export const MobileMenu = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, isAdmin, signOut } = useUserContext();
  
  // Get user initials for avatar
  const userInitials = currentUser?.name 
    ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : 'U';
  
  // Define navigation items based on user role
  const getNavItems = () => {
    const items = [
      { name: 'Dashboard', icon: <MenuIcon className="h-5 w-5" />, path: '/dashboard' },
      { name: 'Properties', icon: <MenuIcon className="h-5 w-5" />, path: '/properties' },
      { name: 'Requests', icon: <MenuIcon className="h-5 w-5" />, path: '/requests' },
      { name: 'Reports', icon: <MenuIcon className="h-5 w-5" />, path: '/reports' },
    ];
    
    // Add Billing & Security for admins only
    if (isAdmin) {
      items.push({ name: 'Billing & Security', icon: <Shield className="h-5 w-5" />, path: '/settings' });
    }
    
    // Add Settings for admin and manager
    if (isAdmin || currentUser?.role === 'manager') {
      items.push({ name: 'Settings', icon: <Settings className="h-5 w-5" />, path: '/settings' });
    }
    
    return items;
  };
  
  const navItems = getNavItems();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  const handleSignOut = async (e?: React.MouseEvent) => {
    // Prevent any default behavior and event bubbling
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log("🔐 MobileMenu: Starting sign out");
    
    try {
      // Add timeout to prevent hanging
      const signOutPromise = signOut();
      const timeoutPromise = new Promise((resolve) => 
        setTimeout(() => {
          console.warn("🔐 MobileMenu: Sign out taking too long, forcing redirect");
          resolve(null);
        }, 6000) // 6 second timeout
      );
      
      await Promise.race([signOutPromise, timeoutPromise]);
      
      console.log("🔐 MobileMenu: Sign out completed, forcing redirect");
    } catch (error) {
      console.error("🔐 MobileMenu: Error during sign out:", error);
    } finally {
      // Always redirect, even if sign out fails or times out
      console.log("🔐 MobileMenu: Redirecting to login");
      window.location.href = '/login';
    }
  };

  // Log user info for debugging - updated to use isAdmin as boolean
  console.log('MobileMenu - Current user:', currentUser);
  console.log('MobileMenu - Is admin?', isAdmin);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <MenuIcon className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-md bg-blue-500 flex items-center justify-center mr-3">
                <span className="text-white font-bold">H</span>
              </div>
              <span className="text-xl font-bold">HousingHub</span>
            </div>
          </SheetTitle>
        </SheetHeader>
        <div className="mt-8 flex flex-col space-y-4">
          {navItems.map((item) => (
            <SheetClose asChild key={item.name}>
              <Link
                to={item.path}
                className={`flex items-center px-2 py-3 rounded-md transition-colors ${
                  isActive(item.path)
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </Link>
            </SheetClose>
          ))}
          <div className="h-px bg-gray-200 my-4"></div>
          <div className="px-2">
            <div className="flex items-center space-x-3 mb-6">
              <Avatar>
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{currentUser?.name}</p>
                <p className="text-sm text-gray-500">{currentUser?.email}</p>
                <p className="text-xs text-gray-400">Role: {currentUser?.role}</p>
              </div>
            </div>
            <Button className="w-full bg-blue-500 hover:bg-blue-600">
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
            <Button 
              variant="outline" 
              className="w-full mt-2"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;
