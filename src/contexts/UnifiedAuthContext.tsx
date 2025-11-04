import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { User, UserRole } from '@/types/user';
import { toast } from '@/lib/toast';
import { authDebugMarker } from '@/auth-debug';
import '@/auth-debug'; // Force import to trigger debug logs
import { setSentryUser } from '@/lib/sentry';
import { visibilityCoordinator } from '@/utils/visibilityCoordinator';

console.log('🚀 UnifiedAuth Context loading with debug marker:', authDebugMarker);

// Import the full AddUserResult interface
export interface AddUserResult {
  success: boolean;
  message: string;
  userId?: string;
  emailSent?: boolean;
  emailError?: string;
  testMode?: boolean;
  testModeInfo?: string;
  isNewUser?: boolean;
  isExistingUserAddedToOrg?: boolean;
  email?: string;
}

// Organization types
interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  settings: any;
}

interface UserOrganization {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  organization: Organization;
}

interface UnifiedAuthContextType {
  // Simple auth properties
  currentUser: User | null;
  session: Session | null;
  loading: boolean;
  isInitialized: boolean; // Track if initial auth check is complete
  isSigningOut: boolean; // Track sign out process to prevent UI flashing
  signOut: () => Promise<void>;
  
  // Multi-organization properties
  currentOrganization: Organization | null;
  userOrganizations: UserOrganization[];
  switchOrganization: (organizationId: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
  getCurrentUserRole: () => string;
  
  // Admin helper
  isAdmin: boolean;
  canAccessProperty: (propertyId: string) => boolean;
  
  // User management
  users: User[];
  fetchUsers: () => Promise<void>;
  addUser: (email: string, name: string, role: UserRole, assignedProperties?: string[]) => Promise<AddUserResult>;
  updateUser: (user: User) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  resetPassword: (userId: string, email: string) => Promise<{success: boolean; message: string}>;
  adminResetPassword: (userId: string, email: string) => Promise<{success: boolean; message: string}>;
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType | undefined>(undefined);

export const useUnifiedAuth = () => {
  const context = useContext(UnifiedAuthContext);
  if (!context) {
    throw new Error('useUnifiedAuth must be used within a UnifiedAuthProvider');
  }
  return context;
};

// Compatibility hooks for existing components
export const useSimpleAuth = () => {
  const context = useUnifiedAuth();
  return {
    currentUser: context.currentUser,
    session: context.session,
    loading: context.loading,
    isInitialized: context.isInitialized,
    isSigningOut: context.isSigningOut,
    signOut: context.signOut,
    isAdmin: context.isAdmin,
    switchOrganization: context.switchOrganization,
    refreshUser: context.refreshOrganizations, // Map to available method
    currentOrganization: context.currentOrganization
  };
};

export const useMultiOrganizationContext = () => {
  const context = useUnifiedAuth();
  return {
    currentOrganization: context.currentOrganization,
    userOrganizations: context.userOrganizations,
    loading: context.loading,
    error: null, // For compatibility
    switchOrganization: context.switchOrganization,
    refreshOrganizations: context.refreshOrganizations,
    getCurrentUserRole: context.getCurrentUserRole,
    currentUser: context.currentUser
  };
};

export const useUserContext = () => {
  const context = useUnifiedAuth();
  return {
    currentUser: context.currentUser,
    users: context.users,
    loading: context.loading,
    loadingError: null,
    fetchUsers: context.fetchUsers,
    addUser: context.addUser,
    updateUser: context.updateUser,
    removeUser: context.removeUser,
    resetPassword: context.resetPassword,
    adminResetPassword: context.adminResetPassword,
    isAdmin: context.isAdmin,
    canAccessProperty: context.canAccessProperty,
    signOut: context.signOut
  };
};

// Simple user conversion with timeout and better error handling
const convertSupabaseUser = async (supabaseUser: SupabaseUser): Promise<User> => {
  try {
    console.log('🔄 UnifiedAuth v12.0 - convertSupabaseUser called for:', supabaseUser.email);
    
    // CRITICAL FIX: Add AbortSignal with aggressive timeout to prevent hanging
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 8000); // 8 second timeout
    
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .abortSignal(abortController.signal)
        .maybeSingle();
      
      clearTimeout(timeoutId);
      
      if (profileError) {
        console.warn('🔄 UnifiedAuth v12.0 - Profile query error:', profileError.message);
      }
      
      console.log('🔄 UnifiedAuth v12.0 - Profile query completed:', { 
        hasProfile: !!profile, 
        hasOrganization: !!profile?.organization_id,
        error: profileError?.message 
      });

      // Create user object with fallbacks - always succeed
      const user: User = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: profile?.name || supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
        role: (profile?.role as UserRole) || 'manager',
        assignedProperties: profile?.assigned_properties || [],
        createdAt: profile?.created_at || supabaseUser.created_at,
        organization_id: profile?.organization_id || null,
        session_organization_id: profile?.session_organization_id || null
      };

      console.log('🔄 UnifiedAuth v12.0 - User converted successfully:', {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organization_id: user.organization_id,
        session_organization_id: user.session_organization_id,
        needsOnboarding: !user.organization_id
      });

      return user;
    } catch (queryError: any) {
      clearTimeout(timeoutId);
      
      if (queryError.name === 'AbortError') {
        console.warn('🔄 UnifiedAuth v12.0 - Profile query timed out, using fallback');
      } else {
        console.error('🔄 UnifiedAuth v12.0 - Profile query failed:', queryError);
      }
      
      // Return basic user on timeout/error
      return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: supabaseUser.email?.split('@')[0] || 'User',
        role: 'manager' as UserRole,
        assignedProperties: [],
        createdAt: supabaseUser.created_at,
        organization_id: null,
        session_organization_id: null
      };
    }
  } catch (error) {
    console.error('🔄 UnifiedAuth v12.0 - Error converting user:', error);
    // Return basic user on error
    const fallbackUser = {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: supabaseUser.email?.split('@')[0] || 'User',
      role: 'manager' as UserRole,
      assignedProperties: [],
      createdAt: supabaseUser.created_at,
      organization_id: null,
      session_organization_id: null
    };
    
    console.log('🔄 UnifiedAuth v12.0 - Returning fallback user:', fallbackUser);
    return fallbackUser;
  }
};

export const UnifiedAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initialCheckDone = useRef(false); // CRITICAL: Use ref to prevent reset on remount
  const [isSigningOut, setIsSigningOut] = useState(false); // Track sign out process
  const hasCompletedInitialSetup = useRef(false); // CRITICAL: Track if we've ever completed setup
  
  // Organization state
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<UserOrganization[]>([]);
  
  // User management state
  const [users, setUsers] = useState<User[]>([]);
  
  // CRITICAL FIX: Track if this is a background refresh to prevent loading cascades
  const [isBackgroundRefresh, setIsBackgroundRefresh] = useState(false);

  const signOut = useCallback(async () => {
    try {
      console.log('🔐 UnifiedAuth - Starting sign out process');
      
      // Set signing out flag FIRST to prevent UI flashing during cleanup
      setIsSigningOut(true);
      
      // Clear Sentry user context immediately
      setSentryUser(null);
      
      // Import auth cleanup utilities
      const { performRobustSignOut } = await import('@/utils/authCleanup');
      
      // Perform robust sign out with timeout
      const signOutPromise = performRobustSignOut(supabase);
      const timeoutPromise = new Promise((resolve) => 
        setTimeout(() => {
          console.warn('🔐 UnifiedAuth - Sign out timeout, forcing cleanup');
          resolve(true);
        }, 5000) // 5 second timeout
      );
      
      await Promise.race([signOutPromise, timeoutPromise]);
      
      // Clear local state immediately
      setCurrentUser(null);
      setSession(null);
      setUserOrganizations([]);
      setCurrentOrganization(null);
      
      console.log('🔐 UnifiedAuth - Sign out completed successfully');
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('🔐 UnifiedAuth - Error signing out:', error);
      
      // Even on error, clear local state
      setCurrentUser(null);
      setSession(null);
      setUserOrganizations([]);
      setCurrentOrganization(null);
      
      toast.error('Error signing out');
    }
  }, []);

  const fetchUserOrganizations = async (user: User) => {
    if (!user?.id) {
      console.log('UnifiedAuth - No user ID, clearing organizations');
      setUserOrganizations([]);
      setCurrentOrganization(null);
      return null;
    }

    try {
      console.log('UnifiedAuth - Fetching organizations for user:', user.id);

      // CRITICAL FIX: 60-second timeout to prevent blocking on tab switches
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        // Fetch user organizations
        const { data: userOrgs, error: userOrgsError } = await supabase
          .from('user_organizations')
          .select(`
            *,
            organization_id,
            role,
            is_active,
            is_default
          `)
          .eq('user_id', user.id)
          .eq('is_active', true);

        clearTimeout(timeoutId);

        if (userOrgsError) {
          console.warn('UnifiedAuth - Error fetching user organizations:', userOrgsError);
          throw userOrgsError;
        }

        if (!userOrgs || userOrgs.length === 0) {
          console.log('UnifiedAuth - No organizations found, using profile organization_id');
          setUserOrganizations([]);
          setCurrentOrganization(null);
          return user.organization_id || null;
        }

        // Fetch organization details with timeout - 60 seconds
        const orgTimeoutId = setTimeout(() => controller.abort(), 60000);
        const orgIds = userOrgs.map((uo: any) => uo.organization_id);
        
        const { data: organizations, error: orgsError } = await supabase
          .from('organizations')
          .select('*')
          .in('id', orgIds);

        clearTimeout(orgTimeoutId);

        if (orgsError) {
          console.warn('UnifiedAuth - Error fetching organizations:', orgsError);
          throw orgsError;
        }

        const mappedUserOrganizations = userOrgs.map((uo: any) => {
          const organization = organizations?.find(org => org.id === uo.organization_id);
          return {
            ...uo,
            organization: organization as Organization
          };
        }).filter((uo: any) => uo.organization);

        setUserOrganizations(mappedUserOrganizations);

        // Set current organization (prefer session, then default, then first)
        if (mappedUserOrganizations.length > 0) {
          let targetOrg: Organization | null = null;

          // Try session organization first
          if (user.session_organization_id) {
            const sessionOrg = mappedUserOrganizations.find(
              (uo: any) => uo.organization_id === user.session_organization_id
            );
            if (sessionOrg) {
              targetOrg = sessionOrg.organization;
            }
          }

          // Fallback to default organization
          if (!targetOrg) {
            const defaultOrg = mappedUserOrganizations.find((uo: any) => uo.is_default);
            if (defaultOrg) {
              targetOrg = defaultOrg.organization;
            }
          }

          // Final fallback to first organization
          if (!targetOrg) {
            targetOrg = mappedUserOrganizations[0].organization;
          }

          setCurrentOrganization(targetOrg);
          console.log('UnifiedAuth - Set current organization:', targetOrg?.name);
          return targetOrg?.id || null;
        }
        
        return user.organization_id || null;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (controller.signal.aborted) {
          console.warn('UnifiedAuth - Organization fetch timeout after 3s');
          throw new Error('Organization fetch timeout');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('UnifiedAuth - Error in fetchUserOrganizations:', error);
      // Only clear if it's not a timeout - preserve existing data on timeout
      if (!(error instanceof Error && error.message === 'Organization fetch timeout')) {
        setUserOrganizations([]);
        setCurrentOrganization(null);
      }
      return user.organization_id || null;
    }
  };

  const switchOrganization = useCallback(async (organizationId: string) => {
    try {
      const targetOrgData = userOrganizations.find(
        uo => uo.organization_id === organizationId
      );

      if (!targetOrgData) {
        throw new Error('Organization not found');
      }

      // Call the database function to switch organization
      const { error } = await supabase.rpc('switch_user_organization', {
        new_org_id: organizationId
      });

      if (error) {
        throw new Error(`Failed to switch organization: ${error.message}`);
      }

      setCurrentOrganization(targetOrgData.organization);
      toast.success(`Switched to ${targetOrgData.organization.name}`);
    } catch (error) {
      console.error('Error switching organization:', error);
      toast.error('Failed to switch organization');
    }
  }, [userOrganizations]);

  const refreshOrganizations = useCallback(async () => {
    if (!currentUser?.id) return;
    
    try {
      console.log('🔄 Refreshing user data and organizations...');
      
      // Refetch user profile to get updated role
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      
      // Convert to User type with fresh data
      const freshUser = await convertSupabaseUser(authUser);
      if (freshUser) {
        setCurrentUser(freshUser);
        // Fetch organizations with the fresh user data
        await fetchUserOrganizations(freshUser);
      }
      
      console.log('✅ User data and organizations refreshed');
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  }, [currentUser?.id]);

  const getCurrentUserRole = useCallback((): string => {
    if (!currentOrganization || !currentUser?.id) {
      return currentUser?.role || 'manager';
    }

    const userOrg = userOrganizations.find(
      uo => uo.organization_id === currentOrganization.id
    );

    return userOrg?.role || currentUser?.role || 'manager';
  }, [currentOrganization?.id, currentUser?.id, currentUser?.role, userOrganizations]);

  // Use organization role when available, fallback to profile role
  // CRITICAL: Memoize effectiveRole to prevent infinite re-renders
  const effectiveRole = useMemo(() => {
    if (!currentUser) return 'manager';
    
    // If user has organizations, use the organization role
    if (currentOrganization && userOrganizations.length > 0) {
      const userOrg = userOrganizations.find(
        uo => uo.organization_id === currentOrganization.id
      );
      if (userOrg) {
        return userOrg.role;
      }
    }
    
    // Fallback to profile role
    return currentUser.role || 'manager';
  }, [currentUser?.id, currentUser?.role, currentOrganization?.id, userOrganizations]);

  const isAdmin = useMemo(() => effectiveRole === 'admin', [effectiveRole]);

  const canAccessProperty = useCallback((propertyId: string): boolean => {
    if (!currentUser) return false;
    if (effectiveRole === 'admin') return true;
    return currentUser.assignedProperties?.includes(propertyId) || false;
  }, [currentUser?.id, currentUser?.assignedProperties, effectiveRole]);

  // Create enhanced currentUser with effective role
  // CRITICAL: Only create new object if actual values changed
  const enhancedCurrentUser = useMemo(() => {
    if (!currentUser) return null;
    
    // If role matches, return the same object to prevent unnecessary re-renders
    if (currentUser.role === effectiveRole) {
      return currentUser;
    }
    
    // Only create new object if role actually changed
    return {
      ...currentUser,
      role: effectiveRole as UserRole
    };
  }, [currentUser, effectiveRole]); // Simplified deps - only recompute if currentUser or role changes

  // User management functions
  const fetchUsers = useCallback(async () => {
    console.log('UnifiedAuth - fetchUsers called, effectiveRole:', effectiveRole, 'currentOrganization:', !!currentOrganization);
    
    const isAdminRole = effectiveRole === 'admin';
    
    if (!isAdminRole) {
      console.log('UnifiedAuth - Not fetching users (not admin)');
      return;
    }

    try {
      console.log('UnifiedAuth - Fetching users for practice leader dropdown');
      const { fetchAllUsers } = await import('@/services/user/userQueries');
      
      // CRITICAL FIX: 60-second timeout for user queries with RLS
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn('⏱️ User fetch timeout after 60s');
      }, 60000);
      
      try {
        const userData = await fetchAllUsers(controller.signal);
        clearTimeout(timeoutId);
        
        console.log('UnifiedAuth - Raw user data received:', userData.length, 'users');
        
        // Convert to User type format
        const convertedUsers = userData.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          assignedProperties: user.assignedProperties || [],
          createdAt: user.createdAt,
          organization_id: user.organization_id
        }));
        
        console.log('UnifiedAuth - Converted users:', convertedUsers);
        setUsers(convertedUsers);
        console.log('UnifiedAuth - Users set for practice leaders:', convertedUsers.length);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error('UnifiedAuth - Error fetching users:', error);
      if (error instanceof Error && (error.message.includes('aborted') || error.message.includes('timeout'))) {
        console.warn('⏱️ User fetch aborted due to timeout');
      }
    }
  }, [effectiveRole]);

  const addUser = useCallback(async (email: string, name: string, role: UserRole, assignedProperties?: string[]): Promise<AddUserResult> => {
    // Basic implementation - would be replaced with actual service call
    console.log('addUser called:', { email, name, role, assignedProperties });
    return {
      success: false,
      message: 'User management not fully implemented yet',
      email
    };
  }, []);

  const updateUser = useCallback(async (user: User) => {
    console.log('updateUser called:', user);
  }, []);

  const removeUser = useCallback(async (userId: string) => {
    console.log('removeUser called:', userId);
  }, []);

  const resetPassword = useCallback(async (userId: string, email: string) => {
    console.log('resetPassword called:', { userId, email });
    try {
      // Use production URL if on production, otherwise use current origin
      const isProduction = window.location.hostname === 'housinghub.app' || window.location.hostname === 'www.housinghub.app';
      const redirectUrl = isProduction 
        ? `https://housinghub.app/setup-password?email=${encodeURIComponent(email)}`
        : `${window.location.origin}/setup-password?email=${encodeURIComponent(email)}`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      
      if (error) {
        console.error('Error requesting password reset:', error);
        return {
          success: false,
          message: error.message || 'Password reset failed'
        };
      }
      
      return {
        success: true,
        message: `Password reset email sent to ${email}`
      };
    } catch (error: any) {
      console.error('Error in resetPassword:', error);
      return {
        success: false,
        message: error.message || 'Unknown error occurred'
      };
    }
  }, []);

  const adminResetPassword = useCallback(async (userId: string, email: string) => {
    console.log('adminResetPassword called:', { userId, email });
    try {
      // Use production URL if on production, otherwise use current origin
      const isProduction = window.location.hostname === 'housinghub.app' || window.location.hostname === 'www.housinghub.app';
      const redirectUrl = isProduction 
        ? `https://housinghub.app/setup-password?email=${encodeURIComponent(email)}`
        : `${window.location.origin}/setup-password?email=${encodeURIComponent(email)}`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      
      if (error) {
        console.error('Error requesting admin password reset:', error);
        return {
          success: false,
          message: error.message || 'Password reset failed'
        };
      }
      
      return {
        success: true,
        message: `Password reset email sent to ${email}`
      };
    } catch (error: any) {
      console.error('Error in adminResetPassword:', error);
      return {
        success: false,
        message: error.message || 'Unknown error occurred'
      };
    }
  }, []);

  // Register auth refresh with visibility coordinator - with cleanup to prevent duplicates
  // MULTI-LAYER SESSION RESTORATION WITH RETRY: localStorage → cookies → retry → fail gracefully
  useEffect(() => {
    const refreshAuth = async (): Promise<boolean> => {
      console.log('🔄 UnifiedAuth v28.0 - Coordinator-triggered session check');
      
      // CRITICAL FIX: First, try to get current session WITHOUT any delays
      // This checks if Supabase client already has the session in memory
      try {
        console.log('⚡ UnifiedAuth v28.0 - Quick session check (in-memory)...');
        const { data: { session: quickSession } } = await supabase.auth.getSession();
        
        if (quickSession?.access_token) {
          const expiresAt = quickSession.expires_at ? quickSession.expires_at * 1000 : 0;
          const isExpired = expiresAt > 0 && Date.now() >= expiresAt;
          
          if (!isExpired) {
            console.log('✅ UnifiedAuth v28.0 - Quick session check: Valid session found!');
            
            // Force immediate backup
            const { forceSessionBackup } = await import('@/integrations/supabase/client');
            forceSessionBackup(quickSession);
            
            // Update state if needed
            if (currentUser?.id !== quickSession.user.id || !session?.access_token) {
              console.log('🔄 UnifiedAuth v28.0 - Updating user state from quick session');
              const user = await convertSupabaseUser(quickSession.user);
              setCurrentUser(user);
              setSession(quickSession);
            }
            
            return true;
          }
        }
        
        console.log('⚡ UnifiedAuth v28.0 - Quick check failed, proceeding to full restoration...');
      } catch (quickError) {
        console.warn('⚡ UnifiedAuth v28.0 - Quick check error:', quickError);
      }
      
      // AGGRESSIVE RETRY: Try up to 5 times with increasing delays
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          if (attempt > 1) {
            const delayMs = attempt * 300; // 300ms, 600ms, 900ms, 1200ms, 1500ms
            console.log(`🔄 UnifiedAuth v28.0 - Retry attempt ${attempt}/5 (delay: ${delayMs}ms)`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
          
          // LAYER 1: Try localStorage FIRST (fastest and most reliable)
          console.log('📦 UnifiedAuth v28.0 - Trying localStorage...');
          const { data: { session: currentSession }, error: currentError } = await supabase.auth.getSession();
          
          if (!currentError && currentSession?.access_token) {
            // Validate session isn't expired
            const expiresAt = currentSession.expires_at ? currentSession.expires_at * 1000 : 0;
            const isExpired = expiresAt > 0 && Date.now() >= expiresAt;
            
            if (!isExpired) {
              console.log('✅ UnifiedAuth v28.0 - Valid session found in localStorage');
              
              // CRITICAL: Force immediate backup to cookie
              const { forceSessionBackup } = await import('@/integrations/supabase/client');
              const backed = forceSessionBackup(currentSession);
              console.log('💾 UnifiedAuth v28.0 - Session backup to cookie:', backed ? 'SUCCESS' : 'FAILED');
              
              // Update state if needed
              if (currentUser?.id !== currentSession.user.id || !session?.access_token) {
                console.log('🔄 UnifiedAuth v28.0 - Updating user state from localStorage');
                const user = await convertSupabaseUser(currentSession.user);
                setCurrentUser(user);
                setSession(currentSession);
              }
              
              return true;
            } else {
              console.warn('⚠️ UnifiedAuth v28.0 - localStorage session expired');
            }
          } else if (currentError) {
            console.error('📦 UnifiedAuth v28.0 - localStorage error:', currentError);
          } else {
            console.warn('📦 UnifiedAuth v28.0 - No session in localStorage');
          }
          
          // LAYER 2: Try cookie backup
          console.log('🍪 UnifiedAuth v28.0 - Trying cookie backup...');
          const { restoreSessionFromCookie } = await import('@/integrations/supabase/client');
          const cookieSession = await restoreSessionFromCookie();
          
          if (cookieSession?.access_token) {
            // Validate session isn't expired
            const expiresAt = cookieSession.expires_at ? cookieSession.expires_at * 1000 : 0;
            const isExpired = expiresAt > 0 && Date.now() >= expiresAt;
            
            if (!isExpired) {
              console.log('✅ UnifiedAuth v28.0 - Session restored from cookie!');
              const user = await convertSupabaseUser(cookieSession.user);
              setCurrentUser(user);
              setSession(cookieSession);
              return true;
            } else {
              console.warn('⚠️ UnifiedAuth v28.0 - Cookie session expired');
            }
          } else {
            console.warn('🍪 UnifiedAuth v28.0 - No valid cookie session');
          }
          
          // If we're not on last attempt, retry
          if (attempt < 5) {
            console.warn(`⚠️ UnifiedAuth v28.0 - Attempt ${attempt} failed, will retry...`);
            continue;
          }
          
          // LAYER 3: All attempts exhausted - user needs to re-login
          console.error('❌ UnifiedAuth v28.0 - Session restoration failed after all retries');
          console.log('🔐 UnifiedAuth v28.0 - User needs to login again');
          return false;
          
        } catch (error) {
          console.error('❌ UnifiedAuth v28.0 - Coordinator session check error:', error);
          if (attempt === 5) return false;
          continue;
        }
      }
      
      return false;
    };

    const unregister = visibilityCoordinator.onRefresh(refreshAuth);
    console.log('🔄 UnifiedAuth v28.0 - Registered with visibility coordinator');

    return () => {
      unregister();
      console.log('🔄 UnifiedAuth v28.0 - Cleanup: Unregistered from visibility coordinator');
    };
  }, []); // CRITICAL FIX: Empty deps - register only once!

  useEffect(() => {
    console.log('🚀 UnifiedAuth v17.0 - Starting auth initialization at:', new Date().toISOString());
    const startTime = performance.now();
    console.log('🚀 UnifiedAuth v17.0 - Setting up SINGLE auth listener with coordinator', { authDebugMarker });
    
    // Set up ONE auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🚀 UnifiedAuth v17.0 - Auth state changed:', event, 'Session exists:', !!session);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🚀 UnifiedAuth v17.0 - SIGNED_IN event, user email:', session.user.email);
        
        // Set session immediately (non-async)
        setSession(session);
        console.log('🚀 UnifiedAuth v17.0 - Session set, starting user conversion...');
        
        // Coordinator will handle refresh timing
        
        // CRITICAL FIX: Use setTimeout to defer async Supabase calls to prevent deadlocks
        // This is the official Supabase recommendation to avoid auth callback deadlocks
        setTimeout(async () => {
          try {
            console.log('🚀 UnifiedAuth v13.0 - Starting deferred user conversion...');
            const user = await convertSupabaseUser(session.user);
            console.log('🚀 UnifiedAuth v13.0 - User converted:', user.email, 'org_id:', user.organization_id);
            
            // CRITICAL: Set user first so components can start rendering
            setCurrentUser(user);
            console.log('🚀 UnifiedAuth v13.0 - User set, marking auth as loaded');
            
            // Mark loading as false FIRST so UI can start rendering
            setLoading(false);
            
            // Set Sentry user context
            setSentryUser({
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role
            });
            
            // Fetch organizations in background WITHOUT blocking UI
            fetchUserOrganizations(user).catch((orgError) => {
              console.warn('🚀 UnifiedAuth v13.0 - Non-critical org fetch error:', orgError);
            });
            
          } catch (error) {
            console.error('🚀 UnifiedAuth v13.0 - Error in deferred user conversion:', error);
            setCurrentUser(null);
            setSession(null);
            setLoading(false);
            
            // Clear Sentry user context on error
            setSentryUser(null);
          }
        }, 0);
        
      } else if (event === 'SIGNED_OUT') {
        console.log('🚀 UnifiedAuth v17.0 - SIGNED_OUT event');
        setLoading(false);
        setCurrentUser(null);
        setSession(null);
        setUserOrganizations([]);
        setCurrentOrganization(null);
        setIsSigningOut(false); // Clear signing out flag
        
        // Clear Sentry user context
        setSentryUser(null);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('🚀 UnifiedAuth v13.0 - TOKEN_REFRESHED event - No action needed, Supabase handles tokens internally');
        // CRITICAL FIX: Do NOT update session state on TOKEN_REFRESHED
        // Supabase client handles token refresh internally and maintains the real session
        // Updating our state snapshot here causes unnecessary re-renders and loading flashes
        // Our session state is just a reference - Supabase keeps it valid automatically
      } else if (event === 'USER_UPDATED' && session?.user) {
        console.log('🚀 UnifiedAuth v12.0 - USER_UPDATED event');
        // Use setTimeout for USER_UPDATED as well
        setTimeout(async () => {
          try {
            const user = await convertSupabaseUser(session.user);
            setCurrentUser(user);
            setSession(session);
            
            // Update Sentry user context
            setSentryUser({
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role
            });
            
            await fetchUserOrganizations(user);
          } catch (error) {
            console.error('🚀 UnifiedAuth v12.0 - Error converting updated user:', error);
          }
        }, 0);
      } else if (event === 'INITIAL_SESSION') {
        // Don't set loading to false on INITIAL_SESSION - let getSession() handle it
        console.log('🚀 UnifiedAuth v17.0 - INITIAL_SESSION event - waiting for getSession()');
      } else {
        console.log('🚀 UnifiedAuth v17.0 - Other auth event:', event);
        setLoading(false);
      }
    });

    // THEN get initial session with timeout protection
    const sessionTimeout = setTimeout(() => {
      const timeElapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      console.error(`🚀 UnifiedAuth v16.0 - getSession() timeout after ${timeElapsed}s! Forcing loading to false`);
      setLoading(false);
      initialCheckDone.current = true;
      toast.error('Authentication initialization timed out. Please refresh the page.');
    }, 8000); // 8 second max for getSession
    
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(sessionTimeout); // Clear timeout if successful
        const timeElapsed = ((performance.now() - startTime) / 1000).toFixed(2);
        console.log(`🚀 UnifiedAuth v16.0 - Initial session check completed in ${timeElapsed}s:`, session ? 'Found session for ' + session.user?.email : 'No session');
        
        if (session?.user) {
          // Set session immediately (non-async)
          setSession(session);
          console.log('🚀 UnifiedAuth v16.0 - Initial session set, starting user data load');
          
          // Use setTimeout to defer async calls for initial session too
          setTimeout(async () => {
            try {
              console.log('🚀 UnifiedAuth v16.0 - Processing initial session for:', session.user.email);
              const user = await convertSupabaseUser(session.user);
              console.log('🚀 UnifiedAuth v16.0 - Initial user converted:', user.email, 'org_id:', user.organization_id);
              
              // CRITICAL: Set user and mark as ready FIRST
              setCurrentUser(user);
              setLoading(false);
              initialCheckDone.current = true;
              hasCompletedInitialSetup.current = true; // Mark that we've successfully initialized
              console.log('🚀 UnifiedAuth v16.0 - Initial auth complete, starting background org fetch');
              
              // Fetch organizations in background WITHOUT blocking UI
              fetchUserOrganizations(user).catch((orgError) => {
                console.error('🚀 UnifiedAuth v16.0 - Non-critical org error on initial load:', orgError);
              });
              
            } catch (error) {
              console.error('🚀 UnifiedAuth v16.0 - Error converting initial user:', error);
              setCurrentUser(null);
              setSession(null);
              setLoading(false);
              initialCheckDone.current = true;
            }
          }, 0);
        } else {
          setCurrentUser(null);
          setSession(null);
          setLoading(false);
          initialCheckDone.current = true;
          hasCompletedInitialSetup.current = true; // Mark even if no session
        }
      })
      .catch((error) => {
        clearTimeout(sessionTimeout); // Clear timeout on error
        const timeElapsed = ((performance.now() - startTime) / 1000).toFixed(2);
        console.error(`🚀 UnifiedAuth v16.0 - Error getting session after ${timeElapsed}s:`, error);
        setCurrentUser(null);
        setSession(null);
        setLoading(false);
        initialCheckDone.current = true;
        toast.error('Error initializing authentication. Please refresh the page.');
      });

    return () => {
      console.log('🚀 UnifiedAuth v7.0 - Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []); // Empty deps - let Supabase handle session refresh internally

  // CRITICAL: Register with visibility coordinator for session restoration on tab revisit
  useEffect(() => {
    console.log('🔄 UnifiedAuth v29.0 - Registering with visibility coordinator');
    
    const handleTabRevisit = async () => {
      console.log('🔄 UnifiedAuth v29.0 - Coordinator-triggered session check');
      
      // Only restore if we had a session before
      if (!hasCompletedInitialSetup.current) {
        console.log('🔄 UnifiedAuth v29.0 - Skipping refresh - not initialized yet');
        return;
      }
      
      try {
        // Step 1: Quick check (0ms delay)
        console.log('⚡ UnifiedAuth v29.0 - Quick session check (in-memory)...');
        const { data: { session: quickSession } } = await supabase.auth.getSession();
        
        if (quickSession?.access_token) {
          // Validate not expired
          const expiresAt = quickSession.expires_at ? quickSession.expires_at * 1000 : 0;
          const isExpired = expiresAt > 0 && Date.now() >= expiresAt;
          
          if (!isExpired) {
            console.log('✅ UnifiedAuth v29.0 - Quick session check: Valid session found!');
            // Ensure cookie backup is fresh
            const { forceSessionBackup } = await import('@/integrations/supabase/client');
            const backed = forceSessionBackup(quickSession);
            console.log(`💾 UnifiedAuth v29.0 - Session backup to cookie: ${backed ? 'SUCCESS' : 'FAILED'}`);
            return;
          } else {
            console.warn('⚠️ UnifiedAuth v29.0 - Quick check: Session expired');
          }
        } else {
          console.warn('⚠️ UnifiedAuth v29.0 - Quick check: No session in memory');
        }
        
        // Step 2: Full restoration with retries (only if quick check fails)
        console.log('🔄 UnifiedAuth v29.0 - Starting full session restoration...');
        
        for (let attempt = 1; attempt <= 5; attempt++) {
          try {
            console.log(`🔄 UnifiedAuth v29.0 - Restoration attempt ${attempt}/5`);
            
            // Delay increases with each attempt
            const delayMs = attempt * 300; // 300ms, 600ms, 900ms, 1200ms, 1500ms
            if (attempt > 1) {
              console.log(`⏳ UnifiedAuth v29.0 - Waiting ${delayMs}ms before attempt ${attempt}...`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
            
            // Try cookie restoration
            const { restoreSessionFromCookie } = await import('@/integrations/supabase/client');
            const restoredSession = await restoreSessionFromCookie();
            
            if (restoredSession?.access_token) {
              console.log(`✅ UnifiedAuth v29.0 - Session restored successfully on attempt ${attempt}`);
              
              // Update session state
              setSession(restoredSession);
              
              // Convert user
              const user = await convertSupabaseUser(restoredSession.user);
              setCurrentUser(user);
              
              console.log('✅ UnifiedAuth v29.0 - User state updated after restoration');
              return;
            }
            
            console.warn(`⚠️ UnifiedAuth v29.0 - Attempt ${attempt} failed: No session restored`);
          } catch (error) {
            console.error(`❌ UnifiedAuth v29.0 - Attempt ${attempt} error:`, error);
          }
        }
        
        console.error('❌ UnifiedAuth v29.0 - All restoration attempts failed');
      } catch (error) {
        console.error('❌ UnifiedAuth v29.0 - Fatal error during tab revisit:', error);
      }
    };
    
    const unregister = visibilityCoordinator.onRefresh(handleTabRevisit);
    console.log('✅ UnifiedAuth v29.0 - Registered with visibility coordinator');
    
    return () => {
      unregister();
      console.log('🔄 UnifiedAuth v29.0 - Unregistered from visibility coordinator');
    };
  }, []); // Empty deps - register once

  // Fetch users when user becomes admin - ONCE per session
  useEffect(() => {
    console.log('UnifiedAuth - useEffect triggered:', { isAdmin, loading, hasCurrentOrganization: !!currentOrganization });
    
    // CRITICAL FIX: Only fetch users ONCE when admin becomes available
    // Don't refetch on every currentOrganization change
    if (isAdmin && !loading && currentOrganization && users.length === 0) {
      console.log('UnifiedAuth - Initial admin fetch, calling fetchUsers');
      fetchUsers();
    }
  }, [isAdmin, loading]); // REMOVED currentOrganization?.id to prevent constant refetches


  const value: UnifiedAuthContextType = useMemo(() => ({
    currentUser: enhancedCurrentUser,
    session, // Include in value but not in deps - prevents cascade re-renders on token refresh
    // CRITICAL: Override loading to false if we've completed setup once
    // This prevents loading flashes on tab switches even if state updates occur
    loading: hasCompletedInitialSetup.current ? false : loading,
    isInitialized: initialCheckDone.current,
    isSigningOut,
    signOut,
    currentOrganization,
    userOrganizations,
    switchOrganization,
    refreshOrganizations,
    getCurrentUserRole,
    isAdmin,
    canAccessProperty,
    users,
    fetchUsers,
    addUser,
    updateUser,
    removeUser,
    resetPassword,
    adminResetPassword
  }), [
    enhancedCurrentUser,
    // session removed from deps - token refreshes shouldn't trigger context recompute
    loading,
    isSigningOut,
    signOut,
    currentOrganization,
    userOrganizations,
    switchOrganization,
    refreshOrganizations,
    getCurrentUserRole,
    isAdmin,
    canAccessProperty,
    users,
    fetchUsers,
    addUser,
    updateUser,
    removeUser,
    resetPassword,
    adminResetPassword
  ]);

  console.log('🚀 UnifiedAuth v8.0 - Provider render:', { 
    hasCurrentUser: !!enhancedCurrentUser, 
    currentUserEmail: enhancedCurrentUser?.email,
    currentUserRole: enhancedCurrentUser?.role,
    effectiveRole: effectiveRole,
    profileRole: currentUser?.role,
    loading,
    hasOrganization: !!currentOrganization,
    organizationName: currentOrganization?.name,
    timestamp: new Date().toISOString()
  });

  return (
    <UnifiedAuthContext.Provider value={value}>
      {!initialCheckDone.current && !hasCompletedInitialSetup.current ? (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        children
      )}
    </UnifiedAuthContext.Provider>
  );
};