
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import {
  Home,
  ClipboardList,
  BarChart3,
  Settings,
  Bell,
  Menu,
  X,
  User
} from 'lucide-react';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose
} from "@/components/ui/sheet";
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';

const Navbar = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  const navItems = [
    { name: 'Dashboard', icon: <Home className="h-5 w-5" />, path: '/dashboard' },
    { name: 'Requests', icon: <ClipboardList className="h-5 w-5" />, path: '/requests' },
    { name: 'Analytics', icon: <BarChart3 className="h-5 w-5" />, path: '/analytics' },
    { name: 'Settings', icon: <Settings className="h-5 w-5" />, path: '/settings' },
  ];
  
  const NavLinks = () => (
    <nav className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-8">
      {navItems.map((item) => (
        <Link
          key={item.name}
          to={item.path}
          className={`flex items-center px-2 py-1.5 rounded-md transition-colors ${
            isActive(item.path)
              ? 'text-blue-600 font-medium'
              : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          <span className="mr-2">{item.icon}</span>
          {item.name}
        </Link>
      ))}
    </nav>
  );

  return (
    <header className="bg-white shadow-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <div className="h-8 w-8 rounded-md bg-blue-500 flex items-center justify-center mr-3">
                <span className="text-white font-bold">M</span>
              </div>
              <span className="text-xl font-bold text-gray-900">MaintenanceHub</span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          {!isMobile && (
            <div className="hidden md:block">
              <NavLinks />
            </div>
          )}
          
          {/* Actions */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
            </Button>
            
            <Avatar className="h-8 w-8">
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback>FM</AvatarFallback>
            </Avatar>
            
            {/* Mobile menu */}
            {isMobile && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle>
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-md bg-blue-500 flex items-center justify-center mr-3">
                          <span className="text-white font-bold">M</span>
                        </div>
                        <span className="text-xl font-bold">MaintenanceHub</span>
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
                          <AvatarFallback>FM</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">Facility Manager</p>
                          <p className="text-sm text-gray-500">manager@example.com</p>
                        </div>
                      </div>
                      <Button className="w-full bg-blue-500 hover:bg-blue-600">
                        <Plus className="mr-2 h-4 w-4" />
                        New Request
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
