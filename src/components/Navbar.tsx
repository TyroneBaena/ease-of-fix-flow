
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import Logo from '@/components/navigation/Logo';
import NavLinks from '@/components/navigation/NavLinks';
import NotificationBell from '@/components/navigation/NotificationBell';
import UserMenu from '@/components/navigation/UserMenu';
import MobileMenu from '@/components/navigation/MobileMenu';
import { OrganizationSwitcher } from './navigation/OrganizationSwitcher';

const Navbar = () => {
  const isMobile = useIsMobile();

  return (
    <header className="bg-white shadow-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div className="flex items-center">
            <Logo />
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:block">
            <NavLinks />
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block">
              <OrganizationSwitcher />
            </div>
            <NotificationBell />
            <div className="hidden lg:block">
              <UserMenu />
            </div>
            
            {/* Mobile menu - show on smaller screens */}
            <div className="lg:hidden">
              <MobileMenu />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
