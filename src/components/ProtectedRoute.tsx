
import React, { ReactNode, useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useUserContext } from '@/contexts/UserContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading } = useUserContext();
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
