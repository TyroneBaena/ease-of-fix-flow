import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserContext } from '@/contexts/UserContext';
import { Loader2 } from 'lucide-react';

interface ContractorRouteGuardProps {
  children: React.ReactNode;
}

export const ContractorRouteGuard: React.FC<ContractorRouteGuardProps> = ({ children }) => {
  const { currentUser, loading } = useUserContext();

  console.log('🔒 ContractorRouteGuard - State:', { 
    currentUser: !!currentUser, 
    role: currentUser?.role,
    loading 
  });

  // Show loading while authentication is in progress - match ProtectedRoute behavior
  if (loading) {
    console.log('🔒 ContractorRouteGuard - Showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  // Redirect to login if not authenticated - consistent with ProtectedRoute
  if (!currentUser) {
    console.log("🔒 ContractorRouteGuard: User not authenticated, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // Allow admin users (for testing/admin purposes)
  if (currentUser.role === 'admin') {
    console.log("🔒 ContractorRouteGuard: Admin user accessing contractor routes");
    return <>{children}</>;
  }

  // Check if user is a contractor
  if (currentUser.role !== 'contractor') {
    console.log(`🔒 ContractorRouteGuard: User role '${currentUser.role}' not authorized for contractor routes`);
    return <Navigate to="/dashboard" replace />;
  }

  console.log('🔒 ContractorRouteGuard - Rendering contractor content for user:', currentUser.email);
  return <>{children}</>;
};