import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useSimpleAuth } from '@/contexts/UnifiedAuthContext';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { OrganizationOnboarding } from '@/components/auth/OrganizationOnboarding';

interface OrganizationGuardProps {
  children: React.ReactNode;
}

const OrganizationGuard: React.FC<OrganizationGuardProps> = ({ children }) => {
  const { currentUser, loading: authLoading, isSigningOut } = useSimpleAuth();
  const [hasOrganization, setHasOrganization] = useState<boolean | null>(null);
  const [isCheckingOrganization, setIsCheckingOrganization] = useState(true);
  const lastCheckedUserRef = useRef<string | null>(null);

  const checkUserOrganization = useCallback(async (user: any) => {
    if (!user?.id) return false;
    
    try {
      console.log('🔍 OrganizationGuard - Checking organization for user:', user.email);
      
      // Get user's profile to check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, organization_id')
        .eq('id', user.id)
        .maybeSingle();
      
      console.log('🔍 OrganizationGuard - User profile:', profile);
      
      // Contractors don't need organizations - they belong to contractor accounts
      if (profile?.role === 'contractor') {
        console.log('🔍 OrganizationGuard - User is contractor, skipping organization requirement');
        return true;
      }
      
      // Check if user has any active organization memberships
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('user_organizations')
        .select('organization_id, is_active, is_default')
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      console.log('🔍 OrganizationGuard - User organizations:', userOrgs, 'Error:', userOrgsError);
      
      if (userOrgsError) {
        console.error('OrganizationGuard - Error fetching user organizations:', userOrgsError);
        return false;
      }
      
      // If user has active organizations, they don't need onboarding
      if (userOrgs && userOrgs.length > 0) {
        console.log('🔍 OrganizationGuard - User has', userOrgs.length, 'active organizations - access granted');
        return true;
      }
      
      console.log('🔍 OrganizationGuard - User has no active organizations - needs onboarding');
      return false;
    } catch (error) {
      console.error('OrganizationGuard - Error checking user organization:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    const checkOrganization = async () => {
      if (!currentUser) {
        setHasOrganization(null);
        setIsCheckingOrganization(false);
        lastCheckedUserRef.current = null;
        return;
      }

      // Only check if the user ID has changed to prevent infinite loops
      if (lastCheckedUserRef.current === currentUser.id) {
        // User hasn't changed, keep existing organization status
        setIsCheckingOrganization(false);
        return;
      }

      setIsCheckingOrganization(true);
      lastCheckedUserRef.current = currentUser.id;
      
      const hasOrg = await checkUserOrganization(currentUser);
      setHasOrganization(hasOrg);
      setIsCheckingOrganization(false);
    };

    checkOrganization();
  }, [currentUser?.id]); // Only depend on user ID - checkUserOrganization is stable

  const handleOrganizationComplete = async () => {
    console.log('🚀 OrganizationGuard - Organization setup completed, refetching...');
    
    // Don't recheck immediately - let the parent navigation handle it
    // The OrganizationOnboarding component will navigate to the correct dashboard
    // based on the user's role
  };

  console.log('🔒 OrganizationGuard - State check:', { 
    currentUser: !!currentUser, 
    authLoading,
    isSigningOut,
    isCheckingOrganization,
    hasOrganization,
    timestamp: new Date().toISOString()
  });

  // If signing out, show loading to prevent organization onboarding flash
  if (isSigningOut) {
    console.log('🔒 OrganizationGuard - User signing out, showing loading');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  // Show loading while auth is loading
  if (authLoading) {
    console.log('🔒 OrganizationGuard - Auth loading');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    console.log("🔒 OrganizationGuard: User not authenticated, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // Show loading while checking organization
  if (isCheckingOrganization) {
    console.log('🔒 OrganizationGuard - Checking organization');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  // Show organization onboarding ONLY for new signups without invitation
  // Users from password reset or invitation should never reach this state
  if (!hasOrganization) {
    console.log('🔒 OrganizationGuard - User needs organization onboarding');
    
    // Check if this is a fresh signup (no organization at all)
    // Fresh signups should create their organization or use invitation code
    return (
      <OrganizationOnboarding 
        user={currentUser} 
        onComplete={handleOrganizationComplete} 
      />
    );
  }

  console.log('🔒 OrganizationGuard - User has organization, rendering protected content');
  return <>{children}</>;
};

export default OrganizationGuard;