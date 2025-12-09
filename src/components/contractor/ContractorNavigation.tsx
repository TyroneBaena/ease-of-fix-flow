
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ClipboardList, 
  UserCog,
  Calendar
} from 'lucide-react';

type NavItem = {
  name: string;
  path: string;
  icon: React.ReactNode;
}

export const ContractorNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const navItems: NavItem[] = [
    { 
      name: 'Jobs', 
      path: '/contractor-jobs', 
      icon: <ClipboardList className="h-5 w-5" /> 
    },
    { 
      name: 'Schedule', 
      path: '/contractor-schedule', 
      icon: <Calendar className="h-5 w-5" /> 
    },
    { 
      name: 'Profile', 
      path: '/contractor-profile', 
      icon: <UserCog className="h-5 w-5" /> 
    }
  ];
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="hidden md:flex space-x-6">
      {navItems.map((item) => (
        <button
          key={item.name}
          onClick={() => navigate(item.path)}
          className={`flex items-center px-2 py-1.5 rounded-md transition-colors ${
            isActive(item.path) 
              ? 'text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          <span className="mr-2">{item.icon}</span>
          {item.name}
        </button>
      ))}
    </nav>
  );
};
