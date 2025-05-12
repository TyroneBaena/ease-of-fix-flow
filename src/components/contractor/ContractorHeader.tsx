
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserContext } from '@/contexts/UserContext';
import { Skeleton } from '@/components/ui/skeleton';

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
          <div className="flex items-center space-x-4">
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
