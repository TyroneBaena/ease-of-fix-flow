
import React, { ReactNode, useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  
  // Add a safeguard timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeoutElapsed(true);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Add an effect to navigate programmatically instead of using Navigate
  // This helps avoid stale state issues
  useEffect(() => {
    if (!loading && !currentUser && timeoutElapsed) {
      console.log("User not authenticated, redirecting to login");
      navigate('/login', { replace: true });
    }
  }, [loading, currentUser, timeoutElapsed, navigate]);
  
  // Show loading state if still checking authentication and timeout hasn't elapsed
  if (loading && !timeoutElapsed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!currentUser && timeoutElapsed) {
    return <Navigate to="/login" replace />;
  }
  
  // Check role requirements
  if (requireAdmin && currentUser) {
    // Allow access if user is admin or (when specified) a manager
    if (!isAdmin && !(allowManager && currentUser.role === 'manager')) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  // Render children if all checks pass
  return <>{children}</>;
};

export default ProtectedRoute;
