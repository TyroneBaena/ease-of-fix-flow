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
    
    // Query user profile with timeout
    const profilePromise = supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Profile query timeout')), 5000);
    });

    let profile = null;
    try {
      const result = await Promise.race([profilePromise, timeoutPromise]) as any;
      profile = result.data;
      if (result.error) {
        console.warn('Profile query error:', result.error);
      }
    } catch (error) {
      console.warn('Profile query failed:', error);
    }

    // Create user with safe fallbacks
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

    // Get organization if user has one
    let organization: Organization | null = null;
    const orgId = user.session_organization_id || user.organization_id;
    
    if (orgId) {
      try {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', orgId)
          .single();
        
        if (orgData) {
          organization = orgData;
        }
      } catch (error) {
        console.warn('Failed to fetch organization:', error);
      }
    }

    console.log('🔄 SimpleAuth - User converted:', {
      email: user.email,
      role: user.role,
      hasOrganization: !!organization
    });

    return { user, organization };
  } catch (error) {
    console.error('🔄 SimpleAuth - Error converting user:', error);
    
    // Fallback user
    const fallbackUser: User = {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: supabaseUser.email?.split('@')[0] || 'User',
      role: 'manager',
      assignedProperties: [],
      createdAt: supabaseUser.created_at,
      organization_id: null,
      session_organization_id: null
    };
    
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
        setLoading(false);
        
        // Convert user in background to avoid blocking
        setTimeout(async () => {
          try {
            const { user, organization } = await convertSupabaseUser(session.user);
            setCurrentUser(user);
            setCurrentOrganization(organization);
          } catch (error) {
            console.error('🚀 SimpleAuth - Error converting user:', error);
            setCurrentUser(null);
            setCurrentOrganization(null);
          }
        }, 0);
        
      } else if (event === 'SIGNED_OUT') {
        console.log('🚀 SimpleAuth - User signed out');
        setLoading(false);
        setCurrentUser(null);
        setSession(null);
        setCurrentOrganization(null);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('🚀 SimpleAuth - Token refreshed');
        setSession(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Check initial session
  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setSession(session);
          const { user, organization } = await convertSupabaseUser(session.user);
          setCurrentUser(user);
          setCurrentOrganization(organization);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
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