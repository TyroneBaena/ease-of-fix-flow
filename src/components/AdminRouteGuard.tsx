import React, { useRef, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useSimpleAuth } from '@/contexts/UnifiedAuthContext';
import { Loader2 } from 'lucide-react';

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

export const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({ children }) => {
  const { currentUser, isAdmin, loading } = useSimpleAuth();
  const hasLoadedOnceRef = useRef(false);

  // CRITICAL FIX: Track when we've completed initial auth check
  useEffect(() => {
    if (!loading) {
      hasLoadedOnceRef.current = true;
    }
  }, [loading]);

  // CRITICAL FIX: Only show loading during initial load, not on tab switches
  if (loading && !hasLoadedOnceRef.current) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
