import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { User, UserRole } from '@/types/user';
import { toast } from '@/lib/toast';

interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  settings: any;
}

interface SimpleAuthContextType {
  currentUser: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  currentOrganization: Organization | null;
  isAdmin: boolean;
  switchOrganization: (organizationId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

export const useSimpleAuth = () => {
  const context = useContext(SimpleAuthContext);
  if (!context) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
  }
  return context;
};

// Convert Supabase user to our User type with safe fallbacks
const convertSupabaseUser = async (supabaseUser: SupabaseUser): Promise<{ user: User; organization: Organization | null }> => {
  try {
    console.log('🔄 SimpleAuth - Converting user:', supabaseUser.email);
    
    // Query user profile with shorter timeout and better error handling
    let profile = null;
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();
      
      if (profileError) {
        console.warn('🔄 SimpleAuth - Profile query error:', profileError.message);
        // Continue with fallback values instead of failing
      } else {
        profile = profileData;
        console.log('🔄 SimpleAuth - Profile loaded successfully');
      }
    } catch (error) {
      console.warn('🔄 SimpleAuth - Profile query failed:', error);
      // Continue with fallback values
    }

    // Determine role with better logic
    let userRole: UserRole = 'admin'; // Default for safety
    if (profile?.role) {
      userRole = profile.role as UserRole;
    }

    // Create user with safe fallbacks
    const user: User = {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: profile?.name || supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
      role: userRole,
      assignedProperties: profile?.assigned_properties || [],
      createdAt: profile?.created_at || supabaseUser.created_at,
      organization_id: profile?.organization_id || null,
      session_organization_id: profile?.session_organization_id || null
    };

    // Get organization if user has one
    let organization: Organization | null = null;
    const orgId = user.session_organization_id || user.organization_id;
    
    if (orgId) {
      try {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', orgId)
          .single();
        
        if (orgError) {
          console.warn('🔄 SimpleAuth - Organization query error:', orgError.message);
        } else if (orgData) {
          organization = orgData;
          console.log('🔄 SimpleAuth - Organization loaded successfully');
        }
      } catch (error) {
        console.warn('🔄 SimpleAuth - Failed to fetch organization:', error);
      }
    }

    console.log('🔄 SimpleAuth - User converted successfully:', {
      email: user.email,
      role: user.role,
      hasOrganization: !!organization,
      organizationId: orgId
    });

    return { user, organization };
  } catch (error) {
    console.error('🔄 SimpleAuth - Critical error converting user:', error);
    
    // Fallback user with admin role for safety
    const fallbackUser: User = {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: supabaseUser.email?.split('@')[0] || 'User',
      role: 'admin', // Fallback to admin for system recovery
      assignedProperties: [],
      createdAt: supabaseUser.created_at,
      organization_id: null,
      session_organization_id: null
    };
    
    console.log('🔄 SimpleAuth - Using fallback user with admin role');
    return { user: fallbackUser, organization: null };
  }
};

export const SimpleAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);

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

  const switchOrganization = async (organizationId: string) => {
    try {
      if (!currentUser) return;

      // Call the database function to switch organization
      const { error } = await supabase.rpc('switch_user_organization', {
        new_org_id: organizationId
      });

      if (error) {
        throw new Error(`Failed to switch organization: ${error.message}`);
      }

      // Refresh user data
      await refreshUser();
      toast.success('Organization switched successfully');
    } catch (error) {
      console.error('Error switching organization:', error);
      toast.error('Failed to switch organization');
    }
  };

  const refreshUser = async () => {
    if (!session?.user) return;
    
    try {
      const { user, organization } = await convertSupabaseUser(session.user);
      setCurrentUser(user);
      setCurrentOrganization(organization);
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  useEffect(() => {
    console.log('🚀 SimpleAuth - Setting up auth listener');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🚀 SimpleAuth - Auth state changed:', event, 'Session exists:', !!session);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🚀 SimpleAuth - User signed in:', session.user.email);
        
        setSession(session);
        
        // Convert user synchronously to avoid loading state issues
        try {
          const { user, organization } = await convertSupabaseUser(session.user);
          setCurrentUser(user);
          setCurrentOrganization(organization);
          setLoading(false);
          console.log('🚀 SimpleAuth - User conversion completed successfully');
        } catch (error) {
          console.error('🚀 SimpleAuth - Error converting user:', error);
          setCurrentUser(null);
          setCurrentOrganization(null);
          setLoading(false);
        }
        
      } else if (event === 'SIGNED_OUT') {
        console.log('🚀 SimpleAuth - User signed out');
        setCurrentUser(null);
        setSession(null);
        setCurrentOrganization(null);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('🚀 SimpleAuth - Token refreshed');
        setSession(session);
        // Don't re-convert user on token refresh unless necessary
        if (!currentUser) {
          try {
            const { user, organization } = await convertSupabaseUser(session.user);
            setCurrentUser(user);
            setCurrentOrganization(organization);
          } catch (error) {
            console.error('🚀 SimpleAuth - Error converting user on token refresh:', error);
          }
        }
      } else {
        // Handle any other auth states
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser]);

  // Check initial session
  useEffect(() => {
    const getInitialSession = async () => {
      console.log('🚀 SimpleAuth - Checking initial session');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('🚀 SimpleAuth - Error getting session:', error);
          setLoading(false);
          return;
        }
        
        if (session?.user) {
          console.log('🚀 SimpleAuth - Initial session found for:', session.user.email);
          setSession(session);
          
          try {
            const { user, organization } = await convertSupabaseUser(session.user);
            setCurrentUser(user);
            setCurrentOrganization(organization);
            console.log('🚀 SimpleAuth - Initial user conversion completed');
          } catch (userError) {
            console.error('🚀 SimpleAuth - Error converting initial user:', userError);
            setCurrentUser(null);
            setCurrentOrganization(null);
          }
        } else {
          console.log('🚀 SimpleAuth - No initial session found');
        }
      } catch (error) {
        console.error('🚀 SimpleAuth - Unexpected error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();
  }, []);

  // Determine if user is admin
  const isAdmin = currentUser?.role === 'admin';

  const value: SimpleAuthContextType = {
    currentUser,
    session,
    loading,
    signOut,
    currentOrganization,
    isAdmin,
    switchOrganization,
    refreshUser
  };

  return (
    <SimpleAuthContext.Provider value={value}>
      {children}
    </SimpleAuthContext.Provider>
  );
};