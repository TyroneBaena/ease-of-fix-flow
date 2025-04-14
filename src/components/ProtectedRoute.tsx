
import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserContext } from '@/contexts/UserContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  allowManager?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false,
  allowManager = false
}) => {
  const { currentUser, loading } = useUserContext();
  
  // Show loading state if still checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  // Check role requirements
  if (requireAdmin) {
    // Allow access if user is admin or (when specified) a manager
    if (currentUser.role !== 'admin' && !(allowManager && currentUser.role === 'manager')) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  // Render children if all checks pass
  return <>{children}</>;
};

export default ProtectedRoute;
