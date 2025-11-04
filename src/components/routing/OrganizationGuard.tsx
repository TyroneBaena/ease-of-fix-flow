import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { Loader2 } from 'lucide-react';

/**
 * OrganizationGuard Component
 * 
 * Purpose: Ensures users have completed organization onboarding before accessing the app
 * 
 * Root cause fix: Prevents query timeouts by redirecting users without organizations
 * to complete onboarding instead of letting them access data-dependent pages.
 */

const ALLOWED_PATHS_WITHOUT_ORG = [
  '/onboarding',
  '/email-confirm',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password'
];

export const OrganizationGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading, isInitialized } = useUnifiedAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only check after auth is initialized
    if (!isInitialized || loading) {
      return;
    }

    // Allow access to certain paths without organization
    const currentPath = location.pathname;
    const isAllowedPath = ALLOWED_PATHS_WITHOUT_ORG.some(path => 
      currentPath.startsWith(path)
    );

    if (isAllowedPath) {
      return;
    }

    // If user is logged in but has no organization, redirect to onboarding
    if (currentUser && !currentUser.organization_id) {
      console.warn('⚠️ User has no organization - redirecting to onboarding');
      navigate('/onboarding', { replace: true });
    }
  }, [currentUser, loading, isInitialized, navigate, location.pathname]);

  // Show loading state while checking
  if (loading || !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user and not on allowed path, let the ProtectedRoute handle it
  return <>{children}</>;
};
