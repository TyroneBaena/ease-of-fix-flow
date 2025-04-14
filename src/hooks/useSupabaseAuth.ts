
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
        console.log("Found existing session for user:", session.user.id);
        // Use synchronous state updates here
        setCurrentUser(convertToAppUser(session.user));
        setSupabaseUser(session.user);
      } else {
        console.log("No existing session found");
        setCurrentUser(null);
        setSupabaseUser(null);
      }
      
      setLoading(false);
    };

    // Set up listener for auth changes outside the async function
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Auth state changed: ${event}`, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session?.user) {
        // Use setTimeout to defer Supabase calls after the callback has finished
        setTimeout(() => {
          const appUser = convertToAppUser(session.user);
          console.log("Setting user after sign in:", appUser);
          setCurrentUser(appUser);
          setSupabaseUser(session.user);
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        console.log("User signed out");
        setCurrentUser(null);
        setSupabaseUser(null);
      }
    });
    
    subscription = data.subscription;

    // Initialize auth after setting up the listener
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
      console.log(`Signing in with email: ${email}`);
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        console.error("Error signing in:", error);
        throw error;
      }
      
      console.log("Sign in successful:", data.user?.id);
      toast.success("Signed in successfully");
      return data;
    } catch (error) {
      console.error("Error signing in:", error);
      toast.error("Failed to sign in: " + error.message);
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
