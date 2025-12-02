import React, { useRef, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useSimpleAuth } from '@/contexts/UnifiedAuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading } = useSimpleAuth();
  const hasLoadedOnceRef = useRef(false);

  // CRITICAL FIX: Track when we've completed initial auth check
  useEffect(() => {
    if (!loading && (currentUser || !currentUser)) {
      hasLoadedOnceRef.current = true;
    }
  }, [loading, currentUser]);

  console.log('🔒 ProtectedRoute v9.0 - State check:', { 
    currentUser: !!currentUser, 
    currentUserEmail: currentUser?.email,
    loading,
    hasLoadedOnce: hasLoadedOnceRef.current,
    timestamp: new Date().toISOString()
  });

  // CRITICAL FIX: Only show loading during initial load, not on tab switches
  if (loading && !hasLoadedOnceRef.current) {
    console.log('🔒 ProtectedRoute - Showing loading state (initial load)');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Only redirect to login after loading is complete and user is not authenticated
  if (!loading && !currentUser) {
    console.log("🔒 ProtectedRoute: User not authenticated, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // CRITICAL: Check if user has pending password reset OR must_change_password flag
  // If they came via password reset link OR are a new invited user, they MUST complete password setup
  if (!loading && currentUser) {
    const passwordResetPending = sessionStorage.getItem('password_reset_pending');
    const forcePasswordChange = sessionStorage.getItem('force_password_change');
    const resetEmail = sessionStorage.getItem('password_reset_email');
    
    if (passwordResetPending === 'true' || forcePasswordChange === 'true') {
      console.log("🔒 ProtectedRoute: Password change required - redirecting to setup-password");
      const redirectUrl = resetEmail 
        ? `/setup-password?email=${encodeURIComponent(resetEmail)}`
        : `/setup-password?email=${encodeURIComponent(currentUser.email)}`;
      return <Navigate to={redirectUrl} replace />;
    }
  }

  console.log('🔒 ProtectedRoute - Rendering protected content for user:', currentUser?.email);
  return <>{children}</>;
};

export default ProtectedRoute;