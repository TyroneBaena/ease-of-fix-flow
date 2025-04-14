
import React, { ReactNode, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserContext } from '@/contexts/UserContext';
import { Loader2 } from 'lucide-react';

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
  const { currentUser, loading, isAdmin } = useUserContext();
  const [timeoutElapsed, setTimeoutElapsed] = useState(false);
  
  // Add a safeguard timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeoutElapsed(true);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Show loading state if still checking authentication and timeout hasn't elapsed
  if (loading && !timeoutElapsed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
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
    if (!isAdmin && !(allowManager && currentUser.role === 'manager')) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  // Render children if all checks pass
  return <>{children}</>;
};

export default ProtectedRoute;
