
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, UserRole } from '@/types/user';
import { toast } from 'sonner';

export const useSupabaseAuth = () => {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState(null);

  // Fetch user profile data from "user_profiles" table
  const fetchUserProfile = async (userId: string) => {
    try {
      console.log("Fetching profile for user ID:", userId);
      
      // Convert string UUID to number for database queries
      const numericId = parseInt(userId, 10);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', numericId)
        .single();
      
      if (error) {
        console.error("Error details:", error);
        throw error;
      }
      
      if (data) {
        console.log("Found user profile:", data);
        setCurrentUser({
          id: String(data.id),
          name: data.Name || '',
          email: String(data.email) || '',
          role: (String(data.role) as UserRole) || 'manager',
          assignedProperties: data.assigned_properties
            ? String(data.assigned_properties).split(',')
            : [],
          createdAt: String(data.created_at) || new Date().toISOString()
        });
        setSupabaseUser(null);
      } else {
        console.log("No user profile found for ID:", userId);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      toast.error("Failed to fetch user profile");
    }
  };

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | undefined;

    const initializeAuth = async () => {
      setLoading(true);
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setCurrentUser(null);
        setSupabaseUser(null);
      }
      
      setLoading(false);
    };

    // Set up listener for auth changes outside the async function.
    // Fix potential deadlock by not using async function as callback
    const { data } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Use setTimeout to defer Supabase calls after the callback has finished
          setTimeout(() => {
            fetchUserProfile(session.user.id);
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
