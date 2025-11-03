import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { User, UserRole } from '@/types/user';
import { toast } from '@/lib/toast';
import { authDebugMarker } from '@/auth-debug';
import '@/auth-debug'; // Force import to trigger debug logs
import { setSentryUser } from '@/lib/sentry';

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
    console.log('🔄 UnifiedAuth v11.0 - convertSupabaseUser called for:', supabaseUser.email);
    
    // CRITICAL: Use shorter timeout to prevent tab-switch blocking
    // Create a promise with 2-second timeout for the database query
    const profilePromise = supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .maybeSingle();

    // Create timeout promise - 2 seconds instead of 10
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Profile query timeout')), 2000);
    });

    let profile = null;
    let profileError = null;

    try {
      // Race between profile query and timeout
      const result = await Promise.race([profilePromise, timeoutPromise]);
      profile = (result as any).data;
      profileError = (result as any).error;
      
      console.log('🔄 UnifiedAuth v11.0 - Profile query completed:', { 
        hasProfile: !!profile, 
        error: profileError?.message 
      });
    } catch (timeoutError) {
      console.warn('🔄 UnifiedAuth v11.0 - Profile query timed out after 2s, using fallback');
      profileError = timeoutError;
    }

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

    console.log('🔄 UnifiedAuth v11.0 - User converted successfully:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organization_id: user.organization_id,
      session_organization_id: user.session_organization_id
    });

    return user;
  } catch (error) {
    console.error('🔄 UnifiedAuth v6.0 - Error converting user:', error);
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
    
    console.log('🔄 UnifiedAuth v6.0 - Returning fallback user:', fallbackUser);
    return fallbackUser;
  }
};

export const UnifiedAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  
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

      // CRITICAL FIX: 3-second timeout to prevent blocking on tab switches
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

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

        // Fetch organization details with timeout
        const orgTimeoutId = setTimeout(() => controller.abort(), 3000);
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
  }, [currentUser?.id, currentUser?.email, currentUser?.name, currentUser?.organization_id, currentUser?.session_organization_id, effectiveRole]);

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
      const userData = await fetchAllUsers();
      
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
    } catch (error) {
      console.error('UnifiedAuth - Error fetching users:', error);
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
    return { success: false, message: 'Not implemented' };
  }, []);

  const adminResetPassword = useCallback(async (userId: string, email: string) => {
    console.log('adminResetPassword called:', { userId, email });
    return { success: false, message: 'Not implemented' };
  }, []);

  useEffect(() => {
    console.log('🚀 UnifiedAuth v16.0 - Starting auth initialization at:', new Date().toISOString());
    const startTime = performance.now();
    console.log('🚀 UnifiedAuth v6.0 - Setting up SINGLE auth listener (FIXED VERSION)', { authDebugMarker });
    
    // Add tab visibility handler to refresh session
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ UnifiedAuth - Tab visible, refreshing session');
        supabase.auth.getSession().then(({ data: { session: refreshedSession }, error }) => {
          if (error) {
            console.error('❌ UnifiedAuth - Session refresh error:', error);
            return;
          }
          if (refreshedSession) {
            console.log('✅ UnifiedAuth - Session refreshed successfully');
            setSession(refreshedSession);
          }
        }).catch((error) => {
          console.error('❌ UnifiedAuth - Visibility refresh error:', error);
        });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Set up ONE auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🚀 UnifiedAuth v12.0 - Auth state changed:', event, 'Session exists:', !!session);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🚀 UnifiedAuth v12.0 - SIGNED_IN event, user email:', session.user.email);
        
        // Set session immediately (non-async)
        setSession(session);
        console.log('🚀 UnifiedAuth v12.0 - Session set, starting user conversion...');
        
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
        console.log('🚀 UnifiedAuth v12.0 - SIGNED_OUT event');
        setLoading(false);
        setCurrentUser(null);
        setSession(null);
        setUserOrganizations([]);
        setCurrentOrganization(null);
        
        // Clear Sentry user context
        setSentryUser(null);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('🚀 UnifiedAuth v12.0 - TOKEN_REFRESHED event');
        setSession(session);
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
        console.log('🚀 UnifiedAuth v12.0 - INITIAL_SESSION event - waiting for getSession()');
      } else {
        console.log('🚀 UnifiedAuth v12.0 - Other auth event:', event);
        setLoading(false);
      }
    });

    // THEN get initial session with timeout protection
    const sessionTimeout = setTimeout(() => {
      const timeElapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      console.error(`🚀 UnifiedAuth v16.0 - getSession() timeout after ${timeElapsed}s! Forcing loading to false`);
      setLoading(false);
      setInitialCheckDone(true);
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
              setInitialCheckDone(true);
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
              setInitialCheckDone(true);
            }
          }, 0);
        } else {
          setCurrentUser(null);
          setSession(null);
          setLoading(false);
          setInitialCheckDone(true);
        }
      })
      .catch((error) => {
        clearTimeout(sessionTimeout); // Clear timeout on error
        const timeElapsed = ((performance.now() - startTime) / 1000).toFixed(2);
        console.error(`🚀 UnifiedAuth v16.0 - Error getting session after ${timeElapsed}s:`, error);
        setCurrentUser(null);
        setSession(null);
        setLoading(false);
        setInitialCheckDone(true);
        toast.error('Error initializing authentication. Please refresh the page.');
      });

    return () => {
      console.log('🚀 UnifiedAuth v7.0 - Cleaning up auth listener');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      subscription.unsubscribe();
    };
  }, []);

  // REMOVED: Tab visibility checking
  // Supabase handles session refresh automatically through API calls
  // No need for aggressive tab visibility checking that causes loading cascades

  // Fetch users when user becomes admin
  useEffect(() => {
    console.log('UnifiedAuth - useEffect triggered:', { isAdmin, loading, hasCurrentOrganization: !!currentOrganization });
    if (isAdmin && !loading && currentOrganization) {
      console.log('UnifiedAuth - Conditions met, calling fetchUsers');
      fetchUsers();
    }
  }, [isAdmin, loading, currentOrganization?.id]); // Remove fetchUsers from dependencies to prevent loop

  const value: UnifiedAuthContextType = useMemo(() => ({
    currentUser: enhancedCurrentUser,
    session,
    loading,
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
    session,
    loading,
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
      {!initialCheckDone ? (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        children
      )}
    </UnifiedAuthContext.Provider>
  );
};