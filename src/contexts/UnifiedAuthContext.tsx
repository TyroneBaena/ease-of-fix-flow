import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { User, UserRole } from '@/types/user';
import { toast } from '@/lib/toast';

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
    signOut: context.signOut
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
    users: [], // Stub for now
    loading: context.loading,
    loadingError: null,
    fetchUsers: async () => {},
    addUser: async (email: string, name: string, role: UserRole, assignedProperties?: string[]) => ({
      success: false,
      message: 'Not implemented'
    }),
    updateUser: async (user: User) => {},
    removeUser: async (userId: string) => {},
    resetPassword: async (userId: string, email: string) => ({
      success: false,
      message: 'Not implemented'
    }),
    adminResetPassword: async (userId: string, email: string) => ({
      success: false,
      message: 'Not implemented'
    }),
    isAdmin: context.isAdmin,
    canAccessProperty: context.canAccessProperty,
    signOut: context.signOut
  };
};

// Simple user conversion without complex queries or timeouts
const convertSupabaseUser = async (supabaseUser: SupabaseUser): Promise<User> => {
  try {
    console.log('UnifiedAuth - Converting user:', supabaseUser.email);
    
    // Try to get profile from database with a shorter timeout
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn('UnifiedAuth - Profile query error (non-critical):', error.message);
    }

    // Create user object with fallbacks
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

    console.log('UnifiedAuth - User converted:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organization_id: user.organization_id
    });

    return user;
  } catch (error) {
    console.error('UnifiedAuth - Error converting user:', error);
    // Return basic user on error
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
};

export const UnifiedAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Organization state
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<UserOrganization[]>([]);

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
      return 'manager';
    }

    const userOrg = userOrganizations.find(
      uo => uo.organization_id === currentOrganization.id
    );

    return userOrg?.role || 'manager';
  };

  const isAdmin = currentUser?.role === 'admin' || false;

  const canAccessProperty = (propertyId: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return currentUser.assignedProperties?.includes(propertyId) || false;
  };

  useEffect(() => {
    console.log('UnifiedAuth - Setting up auth listener');
    
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('UnifiedAuth - Initial session:', session ? 'Found' : 'None');
      
      if (session?.user) {
        try {
          const user = await convertSupabaseUser(session.user);
          setCurrentUser(user);
          setSession(session);
          // Fetch organizations in background
          fetchUserOrganizations(user);
        } catch (error) {
          console.error('UnifiedAuth - Error converting initial user:', error);
          setCurrentUser(null);
          setSession(null);
        }
      } else {
        setCurrentUser(null);
        setSession(null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('UnifiedAuth - Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const user = await convertSupabaseUser(session.user);
          setCurrentUser(user);
          setSession(session);
          fetchUserOrganizations(user);
        } catch (error) {
          console.error('UnifiedAuth - Error converting signed in user:', error);
          setCurrentUser(null);
          setSession(null);
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setSession(null);
        setUserOrganizations([]);
        setCurrentOrganization(null);
      } else if (event === 'USER_UPDATED' && session?.user) {
        try {
          const user = await convertSupabaseUser(session.user);
          setCurrentUser(user);
          setSession(session);
          fetchUserOrganizations(user);
        } catch (error) {
          console.error('UnifiedAuth - Error converting updated user:', error);
        }
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value: UnifiedAuthContextType = {
    currentUser,
    session,
    loading,
    signOut,
    currentOrganization,
    userOrganizations,
    switchOrganization,
    refreshOrganizations,
    getCurrentUserRole,
    isAdmin,
    canAccessProperty
  };

  console.log('UnifiedAuth - Provider render:', { 
    hasCurrentUser: !!currentUser, 
    currentUserEmail: currentUser?.email,
    loading,
    hasOrganization: !!currentOrganization,
    organizationName: currentOrganization?.name
  });

  return (
    <UnifiedAuthContext.Provider value={value}>
      {children}
    </UnifiedAuthContext.Provider>
  );
};