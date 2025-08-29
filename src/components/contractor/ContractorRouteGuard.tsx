import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserContext } from '@/contexts/UserContext';
import { Loader2 } from 'lucide-react';

interface ContractorRouteGuardProps {
  children: React.ReactNode;
}

export const ContractorRouteGuard: React.FC<ContractorRouteGuardProps> = ({ children }) => {
  const { currentUser, loading } = useUserContext();

  // Show loading while authentication is in progress
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading contractor dashboard...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Allow admin users (for testing purposes)
  if (currentUser.role === 'admin') {
    return <>{children}</>;
  }

  // Check if user is a contractor
  if (currentUser.role !== 'contractor') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};