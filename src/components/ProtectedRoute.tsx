
import React, { ReactNode, useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useUserContext } from '@/contexts/UserContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  allowManager?: boolean;
  restrictContractorAccess?: boolean; // New prop to restrict contractor access for managers
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false,
  allowManager = false,
  restrictContractorAccess = false
}) => {
  const { currentUser, loading, isAdmin } = useUserContext();
  const [timeoutElapsed, setTimeoutElapsed] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const navigate = useNavigate();
  
  // Add a safeguard timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeoutElapsed(true);
    }, 3000); // Increased timeout to 3 seconds for better reliability
    
    return () => clearTimeout(timer);
  }, []);
  
  // Effect to handle authentication redirects
  useEffect(() => {
    if (!loading && timeoutElapsed && !currentUser && !redirecting) {
      console.log("ProtectedRoute: User not authenticated, redirecting to login");
      setRedirecting(true);
      navigate('/login', { replace: true });
    }
  }, [loading, currentUser, timeoutElapsed, navigate, redirecting]);
  
  // Show loading state if still checking authentication and timeout hasn't elapsed
  if (loading && !timeoutElapsed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }
  
  // Redirect to login if not authenticated after timeout
  if (!currentUser && timeoutElapsed) {
    console.log("ProtectedRoute: No user found after timeout, showing Navigate component");
    return <Navigate to="/login" replace />;
  }
  
  // Check role requirements if user is authenticated
  if (requireAdmin && currentUser) {
    // Allow access if user is admin or (when specified) a manager
    if (!isAdmin && !(allowManager && currentUser.role === 'manager')) {
      console.log("ProtectedRoute: User doesn't have required permissions, redirecting to dashboard");
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Restrict contractor access for managers - prevents managers from accessing contractor management
  if (restrictContractorAccess && currentUser?.role === 'manager') {
    console.log("ProtectedRoute: Manager attempting to access contractor-restricted content, redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }
  
  // Only render children if we have a valid authenticated user
  if (currentUser) {
    return <>{children}</>;
  }
  
  // Fallback - should not reach here in normal circumstances
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
    </div>
  );
};

export default ProtectedRoute;
