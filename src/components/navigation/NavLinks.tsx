
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ClipboardList, FileText, Settings, Building } from 'lucide-react';
import { useUserContext } from '@/contexts/UserContext';

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
}

export const NavLinks = () => {
  const location = useLocation();
  const { isAdmin } = useUserContext();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  // Define navigation items based on user role
  const getNavItems = () => {
    const items: NavItem[] = [
      { name: 'Dashboard', icon: <Home className="h-5 w-5" />, path: '/dashboard' },
      { name: 'Properties', icon: <Building className="h-5 w-5" />, path: '/properties' },
      { name: 'Requests', icon: <ClipboardList className="h-5 w-5" />, path: '/requests' },
      { name: 'Reports', icon: <FileText className="h-5 w-5" />, path: '/reports' },
    ];
    
    // Add Settings only for admin
    if (isAdmin()) {
      items.push({ name: 'Settings', icon: <Settings className="h-5 w-5" />, path: '/settings' });
    }
    
    return items;
  };
  
  const navItems = getNavItems();

  return (
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
};

export default NavLinks;
