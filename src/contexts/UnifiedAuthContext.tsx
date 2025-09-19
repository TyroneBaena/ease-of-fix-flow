import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { User, UserRole } from '@/types/user';
import { toast } from '@/lib/toast';
import { authDebugMarker } from '@/auth-debug';
import '@/auth-debug'; // Force import to trigger debug logs

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
    
    // Create a promise with timeout for the database query
    const profilePromise = supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Profile query timeout')), 3000);
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
      console.warn('🔄 UnifiedAuth v11.0 - Profile query timed out, using fallback');
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
  
  // Organization state
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<UserOrganization[]>([]);
  
  // User management state
  const [users, setUsers] = useState<User[]>([]);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error signing out');
    }
  };

  const fetchUserOrganizations = async (user: User) => {
    if (!user?.id) {
      setUserOrganizations([]);
      setCurrentOrganization(null);
      return;
    }

    try {
      console.log('UnifiedAuth - Fetching organizations for user:', user.id);

      // Fetch user organizations
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('user_organizations')
        .select(`
          id,
          user_id,
          organization_id,
          role,
          is_active,
          is_default,
          created_at,
          updated_at
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (userOrgsError) {
        console.warn('UnifiedAuth - Error fetching user organizations:', userOrgsError);
        setUserOrganizations([]);
        setCurrentOrganization(null);
        return;
      }

      if (!userOrgs || userOrgs.length === 0) {
        console.log('UnifiedAuth - No organizations found for user');
        setUserOrganizations([]);
        setCurrentOrganization(null);
        return;
      }

      // Fetch organization details
      const orgIds = userOrgs.map(uo => uo.organization_id);
      const { data: organizations, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds);

      if (orgsError) {
        console.warn('UnifiedAuth - Error fetching organizations:', orgsError);
        setUserOrganizations([]);
        setCurrentOrganization(null);
        return;
      }

      const mappedUserOrganizations = userOrgs.map(uo => {
        const organization = organizations?.find(org => org.id === uo.organization_id);
        return {
          ...uo,
          organization: organization as Organization
        };
      }).filter(uo => uo.organization);

      setUserOrganizations(mappedUserOrganizations);

      // Set current organization (prefer session, then default, then first)
      if (mappedUserOrganizations.length > 0) {
        let targetOrg: Organization | null = null;

        // Try session organization first
        if (user.session_organization_id) {
          const sessionOrg = mappedUserOrganizations.find(
            uo => uo.organization_id === user.session_organization_id
          );
          if (sessionOrg) {
            targetOrg = sessionOrg.organization;
          }
        }

        // Fallback to default organization
        if (!targetOrg) {
          const defaultOrg = mappedUserOrganizations.find(uo => uo.is_default);
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
      }
    } catch (error) {
      console.error('UnifiedAuth - Error in fetchUserOrganizations:', error);
      setUserOrganizations([]);
      setCurrentOrganization(null);
    }
  };

  const switchOrganization = async (organizationId: string) => {
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
  };

  const refreshOrganizations = async () => {
    if (currentUser) {
      await fetchUserOrganizations(currentUser);
    }
  };

  const getCurrentUserRole = (): string => {
    if (!currentOrganization || !currentUser?.id) {
      return currentUser?.role || 'manager';
    }

    const userOrg = userOrganizations.find(
      uo => uo.organization_id === currentOrganization.id
    );

    return userOrg?.role || currentUser?.role || 'manager';
  };

  // Use organization role when available, fallback to profile role
  const getUserEffectiveRole = (): string => {
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
  };

  const effectiveRole = getUserEffectiveRole();
  const isAdmin = effectiveRole === 'admin' || false;

  const canAccessProperty = (propertyId: string): boolean => {
    if (!currentUser) return false;
    if (effectiveRole === 'admin') return true;
    return currentUser.assignedProperties?.includes(propertyId) || false;
  };

  // Create enhanced currentUser with effective role
  const enhancedCurrentUser = currentUser ? {
    ...currentUser,
    role: effectiveRole as UserRole
  } : null;

  // User management functions
  const fetchUsers = useCallback(async () => {
    console.log('UnifiedAuth - fetchUsers called, isAdmin:', isAdmin, 'currentOrganization:', !!currentOrganization);
    
    if (!isAdmin) {
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
  }, [isAdmin]);

  const addUser = async (email: string, name: string, role: UserRole, assignedProperties?: string[]): Promise<AddUserResult> => {
    // Basic implementation - would be replaced with actual service call
    console.log('addUser called:', { email, name, role, assignedProperties });
    return {
      success: false,
      message: 'User management not fully implemented yet',
      email
    };
  };

  const updateUser = async (user: User) => {
    console.log('updateUser called:', user);
  };

  const removeUser = async (userId: string) => {
    console.log('removeUser called:', userId);
  };

  const resetPassword = async (userId: string, email: string) => {
    console.log('resetPassword called:', { userId, email });
    return { success: false, message: 'Not implemented' };
  };

  const adminResetPassword = async (userId: string, email: string) => {
    console.log('adminResetPassword called:', { userId, email });
    return { success: false, message: 'Not implemented' };
  };

  useEffect(() => {
    console.log('🚀 UnifiedAuth v6.0 - Setting up SINGLE auth listener (FIXED VERSION)', { authDebugMarker });
    
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
            console.log('🚀 UnifiedAuth v12.0 - Starting deferred user conversion...');
            const user = await convertSupabaseUser(session.user);
            console.log('🚀 UnifiedAuth v12.0 - User converted successfully:', user.email);
            
            setCurrentUser(user);
            console.log('🚀 UnifiedAuth v12.0 - User set successfully');
            
            // Fetch organizations in background
            try {
              await fetchUserOrganizations(user);
              console.log('🚀 UnifiedAuth v12.0 - Organizations fetched successfully');
            } catch (orgError) {
              console.warn('🚀 UnifiedAuth v12.0 - Non-critical org fetch error:', orgError);
            }
            
            // Only set loading to false after everything is complete
            setLoading(false);
            console.log('🚀 UnifiedAuth v12.0 - Loading set to false after user data loaded');
            
          } catch (error) {
            console.error('🚀 UnifiedAuth v12.0 - Error in deferred user conversion:', error);
            setCurrentUser(null);
            setSession(null);
            setLoading(false);
          }
        }, 0);
        
      } else if (event === 'SIGNED_OUT') {
        console.log('🚀 UnifiedAuth v12.0 - SIGNED_OUT event');
        setLoading(false);
        setCurrentUser(null);
        setSession(null);
        setUserOrganizations([]);
        setCurrentOrganization(null);
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
            await fetchUserOrganizations(user);
          } catch (error) {
            console.error('🚀 UnifiedAuth v12.0 - Error converting updated user:', error);
          }
        }, 0);
      } else {
        console.log('🚀 UnifiedAuth v12.0 - Other auth event:', event);
        setLoading(false);
      }
    });

    // THEN get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🚀 UnifiedAuth v12.0 - Initial session check:', session ? 'Found session for ' + session.user?.email : 'No session');
      
      if (session?.user) {
        // Set session immediately (non-async)
        setSession(session);
        console.log('🚀 UnifiedAuth v12.0 - Initial session set, starting user data load');
        
        // Use setTimeout to defer async calls for initial session too
        setTimeout(async () => {
          try {
            console.log('🚀 UnifiedAuth v12.0 - Processing initial session for:', session.user.email);
            const user = await convertSupabaseUser(session.user);
            console.log('🚀 UnifiedAuth v12.0 - Initial user converted:', user.email);
            setCurrentUser(user);
            
            // Fetch organizations in background
            try {
              await fetchUserOrganizations(user);
              console.log('🚀 UnifiedAuth v12.0 - Initial organizations fetched');
            } catch (orgError) {
              console.error('🚀 UnifiedAuth v12.0 - Non-critical org error on initial load:', orgError);
            }
            
            // Only set loading to false after everything is complete
            setLoading(false);
            console.log('🚀 UnifiedAuth v12.0 - Initial loading complete');
            
          } catch (error) {
            console.error('🚀 UnifiedAuth v12.0 - Error converting initial user:', error);
            setCurrentUser(null);
            setSession(null);
            setLoading(false);
          }
        }, 0);
      } else {
        setCurrentUser(null);
        setSession(null);
        setLoading(false);
      }
    });

    return () => {
      console.log('🚀 UnifiedAuth v7.0 - Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  // Fetch users when user becomes admin
  useEffect(() => {
    console.log('UnifiedAuth - useEffect triggered:', { isAdmin, loading, hasCurrentOrganization: !!currentOrganization });
    if (isAdmin && !loading && currentOrganization) {
      console.log('UnifiedAuth - Conditions met, calling fetchUsers');
      fetchUsers();
    }
  }, [isAdmin, loading, currentOrganization, fetchUsers]);

  const value: UnifiedAuthContextType = {
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
  };

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
      {children}
    </UnifiedAuthContext.Provider>
  );
};