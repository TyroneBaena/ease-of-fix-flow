
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, UserRole } from '@/types/user';
import { convertToAppUser } from './auth/userConverter';
import { signInWithEmailPassword, signOutUser, updateUserRole as updateRole } from './auth/authOperations';
import { toast } from '@/lib/toast';

export const useSupabaseAuth = () => {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let subscription;

    const initializeAuth = async () => {
      setLoading(true);
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log("Found existing session for user:", session.user.id);
        // Set supabase user immediately
        setSupabaseUser(session.user);
        
        // Then fetch and convert profile data
        convertToAppUser(session.user)
          .then(appUser => {
            console.log("Setting user from existing session:", appUser);
            setCurrentUser(appUser);
            setLoading(false);
          })
          .catch(error => {
            console.error("Error converting user:", error);
            setLoading(false);
          });
      } else {
        console.log("No existing session found");
        setCurrentUser(null);
        setSupabaseUser(null);
        setLoading(false);
      }
    };

    // Set up listener for auth changes outside the async function
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Auth state changed: ${event}`, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session?.user) {
        // Set supabase user immediately
        setSupabaseUser(session.user);
        setIsSigningOut(false);
        
        // Use setTimeout to defer profile fetching after the callback has finished
        setTimeout(() => {
          convertToAppUser(session.user)
            .then(appUser => {
              console.log("Setting user after sign in:", appUser);
              setCurrentUser(appUser);
              setLoading(false);
            })
            .catch(error => {
              console.error("Error converting user:", error);
              setLoading(false);
            });
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        console.log("User signed out, clearing state");
        setCurrentUser(null);
        setSupabaseUser(null);
        setIsSigningOut(false);
        setLoading(false);
      } else if (event === 'USER_UPDATED') {
        setTimeout(() => {
          convertToAppUser(session.user)
            .then(appUser => {
              console.log("User updated:", appUser);
              setCurrentUser(appUser);
              setSupabaseUser(session.user);
            })
            .catch(error => console.error("Error converting updated user:", error));
        }, 0);
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
    setLoading(true);
    try {
      const result = await signInWithEmailPassword(email, password);
      return result;
    } catch (error: any) {
      // The toast is already shown in signInWithEmailPassword, so we don't need to show it again here
      console.error('Error in useSupabaseAuth.signIn:', error);
      throw error; // Re-throw the error so it can be caught by the component
    } finally {
      setLoading(false);
    }
  };

  // Sign out with improved error handling and state management
  const signOut = async () => {
    // Prevent multiple simultaneous logout attempts
    if (isSigningOut) {
      console.log("Sign out already in progress, skipping");
      return;
    }

    try {
      setIsSigningOut(true);
      setLoading(true);
      console.log("Starting sign out process in useSupabaseAuth");
      
      // Clear user state immediately to prevent UI issues
      setCurrentUser(null);
      setSupabaseUser(null);
      
      // Call the sign out function
      await signOutUser();
      
      console.log("Sign out completed successfully in useSupabaseAuth");
    } catch (error: any) {
      console.error('Error during sign out in useSupabaseAuth:', error);
      
      // Even if there's an error, ensure the local state is cleared
      setCurrentUser(null);
      setSupabaseUser(null);
      
      // Show error toast but don't throw - we want logout to always "succeed" from UI perspective
      toast.error("Sign out completed with warnings");
    } finally {
      setLoading(false);
      setIsSigningOut(false);
    }
  };

  // Update user role
  const updateUserRole = async (role: UserRole) => {
    if (!currentUser) {
      throw new Error("No user is currently logged in");
    }
    
    setLoading(true);
    try {
      const updatedUser = await updateRole(currentUser.id, role);
      if (updatedUser) {
        setCurrentUser(updatedUser);
      } else {
        // If no user returned but no error was thrown, just update the role locally
        setCurrentUser(prev => prev ? { ...prev, role } : null);
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    currentUser,
    supabaseUser,
    loading,
    signIn,
    signOut,
    updateUserRole
  };
};
