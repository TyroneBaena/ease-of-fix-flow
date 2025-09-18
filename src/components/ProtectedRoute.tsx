import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading } = useSimpleAuth();

  console.log('🔒 ProtectedRoute v8.0 - State check:', { 
    currentUser: !!currentUser, 
    currentUserEmail: currentUser?.email,
    loading,
    timestamp: new Date().toISOString()
  });

  // Show loading while authentication is in progress
  if (loading) {
    console.log('🔒 ProtectedRoute - Showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    console.log("🔒 ProtectedRoute: User not authenticated, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  console.log('🔒 ProtectedRoute - Rendering protected content for user:', currentUser.email);
  return <>{children}</>;
};

export default ProtectedRoute;