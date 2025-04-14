
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, UserRole } from '@/types/user';
import { toast } from 'sonner';

export const useSupabaseAuth = () => {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState(null);

  // Convert Supabase user to application user model
  const convertToAppUser = (authUser) => {
    if (!authUser) return null;
    
    return {
      id: authUser.id,
      name: authUser.user_metadata?.name || '',
      email: authUser.email || '',
      role: (authUser.user_metadata?.role as UserRole) || 'manager',
      assignedProperties: authUser.user_metadata?.assignedProperties || [],
      createdAt: authUser.created_at || new Date().toISOString()
    };
  };

  useEffect(() => {
    let subscription;

    const initializeAuth = async () => {
      setLoading(true);
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setCurrentUser(convertToAppUser(session.user));
      } else {
        setCurrentUser(null);
        setSupabaseUser(null);
      }
      
      setLoading(false);
    };

    // Set up listener for auth changes outside the async function
    // Prevent deadlocks by not using async function as callback
    const { data } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Use setTimeout to defer Supabase calls after the callback has finished
          setTimeout(() => {
            const appUser = convertToAppUser(session.user);
            setCurrentUser(appUser);
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setSupabaseUser(null);
        }
      }
    );
    subscription = data.subscription;

    initializeAuth();

    // Cleanup function to unsubscribe when component unmounts.
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Sign in with email/password
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;
      toast.success("Signed in successfully");
    } catch (error) {
      console.error("Error signing in:", error);
      toast.error("Failed to sign in");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Signed out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    } finally {
      setLoading(false);
    }
  };

  return {
    currentUser,
    supabaseUser,
    loading,
    signIn,
    signOut
  };
};
