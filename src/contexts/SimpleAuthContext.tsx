import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { User, UserRole } from '@/types/user';
import { toast } from '@/lib/toast';

interface SimpleAuthContextType {
  currentUser: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

export const useSimpleAuth = () => {
  const context = useContext(SimpleAuthContext);
  if (!context) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
  }
  return context;
};

// Simple user conversion without complex queries
const convertSupabaseUser = async (supabaseUser: SupabaseUser): Promise<User> => {
  try {
    console.log('SimpleAuth - Converting user:', supabaseUser.email);
    
    // Try to get profile from database
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn('SimpleAuth - Profile query error:', error);
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

    console.log('SimpleAuth - User converted:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organization_id: user.organization_id
    });

    return user;
  } catch (error) {
    console.error('SimpleAuth - Error converting user:', error);
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

export const SimpleAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    console.log('SimpleAuth - Setting up auth listener');
    
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('SimpleAuth - Initial session check:', session ? 'Found session' : 'No session');
      console.log('SimpleAuth - Session user:', session?.user?.email);
      
      if (session?.user) {
        try {
          const user = await convertSupabaseUser(session.user);
          console.log('SimpleAuth - Setting user from initial session:', user.email);
          setCurrentUser(user);
          setSession(session);
        } catch (error) {
          console.error('SimpleAuth - Error converting initial user:', error);
          setCurrentUser(null);
          setSession(null);
        }
      } else {
        console.log('SimpleAuth - No initial session found, clearing user');
        setCurrentUser(null);
        setSession(null);
      }
      console.log('SimpleAuth - Setting loading to false after initial check');
      setLoading(false);
    }).catch(error => {
      console.error('SimpleAuth - Error getting initial session:', error);
      setCurrentUser(null);
      setSession(null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('SimpleAuth - Auth state changed:', event, session ? 'Has session' : 'No session');
      console.log('SimpleAuth - Auth event user:', session?.user?.email);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('SimpleAuth - User signed in:', session.user.email);
        try {
          const user = await convertSupabaseUser(session.user);
          console.log('SimpleAuth - Setting user from sign in:', user.email);
          setCurrentUser(user);
          setSession(session);
        } catch (error) {
          console.error('SimpleAuth - Error converting signed in user:', error);
          setCurrentUser(null);
          setSession(null);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('SimpleAuth - User signed out');
        setCurrentUser(null);
        setSession(null);
      } else if (event === 'USER_UPDATED' && session?.user) {
        console.log('SimpleAuth - User updated:', session.user.email);
        try {
          const user = await convertSupabaseUser(session.user);
          console.log('SimpleAuth - Setting updated user:', user.email);
          setCurrentUser(user);
          setSession(session);
        } catch (error) {
          console.error('SimpleAuth - Error converting updated user:', error);
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('SimpleAuth - Token refreshed:', session.user.email);
        try {
          const user = await convertSupabaseUser(session.user);
          console.log('SimpleAuth - Setting refreshed user:', user.email);
          setCurrentUser(user);
          setSession(session);
        } catch (error) {
          console.error('SimpleAuth - Error converting refreshed user:', error);
        }
      }
      
      // Only set loading to false here if we're not in initial load
      console.log('SimpleAuth - Auth state change complete');
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value: SimpleAuthContextType = {
    currentUser,
    session,
    loading,
    signOut
  };

  console.log('SimpleAuth - Provider render:', { 
    hasCurrentUser: !!currentUser, 
    currentUserEmail: currentUser?.email,
    loading 
  });

  return (
    <SimpleAuthContext.Provider value={value}>
      {children}
    </SimpleAuthContext.Provider>
  );
};