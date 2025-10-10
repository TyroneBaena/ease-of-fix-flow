
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, Home, ClipboardList, Calendar, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { ContractorNavigation } from './ContractorNavigation';
import ContractorNotificationBell from './ContractorNotificationBell';
import { useContractorProfileData } from '@/hooks/contractor/useContractorProfileData';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

export const ContractorHeader = () => {
  const navigate = useNavigate();
  const { signOut, currentUser, loading } = useUserContext();
  const { contractor, loading: contractorLoading } = useContractorProfileData();

  const handleSignOut = async (e?: React.MouseEvent) => {
    // Prevent any default behavior and event bubbling
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      console.log("ContractorHeader: Starting sign out");
      await signOut();
      console.log("ContractorHeader: Sign out completed, forcing redirect");
      
      // Force a full page redirect to ensure complete cleanup
      window.location.href = '/login';
    } catch (error) {
      console.error("ContractorHeader: Error during sign out:", error);
      // Even if there's an error, still force redirect to login
      window.location.href = '/login';
    }
  };

  // Don't render header if no user (during logout process)
  if (!loading && !currentUser) {
    return null;
  }

  return (
    <header className="bg-white shadow-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <h1 
              className="text-xl font-semibold text-gray-900 cursor-pointer"
              onClick={() => currentUser && navigate('/contractor-dashboard')}
            >
              Contractor Portal
            </h1>
          </div>
          
          {/* Desktop Navigation */}
          {currentUser && <ContractorNavigation />}
          
          {/* Mobile Navigation */}
          {currentUser && (
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
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}
          
          <div className="flex items-center space-x-4">
            {currentUser && <ContractorNotificationBell />}
            {loading || contractorLoading ? (
              <Skeleton className="h-5 w-28" />
            ) : currentUser ? (
              <span className="text-sm text-gray-600">
                {contractor?.contactName || currentUser.name || currentUser.email || 'Contractor'}
              </span>
            ) : null}
            {currentUser && (
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
