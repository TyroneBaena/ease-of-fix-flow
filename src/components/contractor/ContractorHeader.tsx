
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, Home, ClipboardList, Calendar, UserCog, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserContext } from '@/contexts/UserContext';
import { Skeleton } from '@/components/ui/skeleton';
import { ContractorNavigation } from './ContractorNavigation';
import ContractorNotificationBell from './ContractorNotificationBell';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

export const ContractorHeader = () => {
  const navigate = useNavigate();
  const { signOut, currentUser, loading } = useUserContext();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <h1 
              className="text-xl font-semibold text-gray-900 cursor-pointer"
              onClick={() => navigate('/contractor-dashboard')}
            >
              Contractor Portal
            </h1>
          </div>
          
          {/* Desktop Navigation */}
          <ContractorNavigation />
          
          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex flex-col space-y-4 mt-8">
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => navigate('/contractor-dashboard')}
                  >
                    <Home className="h-5 w-5 mr-2" />
                    Dashboard
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => navigate('/contractor-jobs')}
                  >
                    <ClipboardList className="h-5 w-5 mr-2" />
                    Jobs
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => navigate('/contractor-schedule')}
                  >
                    <Calendar className="h-5 w-5 mr-2" />
                    Schedule
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => navigate('/contractor-profile')}
                  >
                    <UserCog className="h-5 w-5 mr-2" />
                    Profile
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => navigate('/contractor-settings')}
                  >
                    <Settings className="h-5 w-5 mr-2" />
                    Settings
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          
          <div className="flex items-center space-x-4">
            <ContractorNotificationBell />
            {loading ? (
              <Skeleton className="h-5 w-28" />
            ) : (
              <span className="text-sm text-gray-600">
                {currentUser?.name || currentUser?.email || 'Contractor'}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
