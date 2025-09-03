
import React, { ReactNode, useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useUserContext } from '@/contexts/UserContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading } = useUserContext();
  const [timeoutElapsed, setTimeoutElapsed] = useState(false);
  const navigate = useNavigate();
  
  console.log('🔒 ProtectedRoute - State:', { currentUser: !!currentUser, loading, timeoutElapsed });
  
  // Add a safeguard timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeoutElapsed(true);
      console.log('🔒 ProtectedRoute - Timeout elapsed');
    }, 2000); // Reduced timeout to 2 seconds for faster redirect
    
    return () => clearTimeout(timer);
  }, []);
  
  // Handle redirect when user is not authenticated
  useEffect(() => {
    if (!loading && !currentUser) {
      console.log("🔒 ProtectedRoute: User not authenticated, redirecting to login");
      navigate('/login', { replace: true });
    }
  }, [loading, currentUser, navigate]);
  
  // Show loading state only while actually checking authentication
  if (loading) {
    console.log('🔒 ProtectedRoute - Showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }
  
  // If no user and not loading, redirect immediately
  if (!currentUser) {
    console.log("🔒 ProtectedRoute: No user found, showing Navigate component");
    return <Navigate to="/login" replace />;
  }
  
  // Only render children if we have a valid authenticated user
  console.log('🔒 ProtectedRoute - Rendering protected content for user:', currentUser.email);
  return (
    <OrganizationProvider>
      {children}
    </OrganizationProvider>
  );
};

export default ProtectedRoute;
