
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, UserRole } from '@/types/user';
import { convertToAppUser } from './auth/userConverter';
import { signInWithEmailPassword, signOutUser, updateUserRole as updateRole } from './auth/authOperations';
import { toast } from '@/lib/toast';
import type { Session } from '@supabase/supabase-js';

export const useSupabaseAuth = () => {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let subscription;

    // Set up auth state listener FIRST (best practice)
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Auth state changed: ${event}`, session?.user?.id);
      
      // Store both session and user state
      setSession(session);
      setIsSigningOut(false);
      
      if (event === 'SIGNED_IN' && session?.user) {
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
        setSession(null);
        setLoading(false);
      } else if (event === 'USER_UPDATED' && session?.user) {
        setTimeout(() => {
          convertToAppUser(session.user)
            .then(appUser => {
              console.log("User updated:", appUser);
              setCurrentUser(appUser);
            })
            .catch(error => console.error("Error converting updated user:", error));
        }, 0);
      } else if (event === 'INITIAL_SESSION') {
        // Handle initial session load
        if (session?.user) {
          console.log("Found existing session for user:", session.user.id);
          setTimeout(() => {
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
          }, 0);
        } else {
          console.log("No existing session found");
          setCurrentUser(null);
          setSession(null);
          setLoading(false);
        }
      }
    });
    
    subscription = data.subscription;

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !currentUser) {
        console.log("Manual session check - found session for user:", session.user.id);
        setSession(session);
        convertToAppUser(session.user)
          .then(appUser => {
            console.log("Setting user from manual session check:", appUser);
            setCurrentUser(appUser);
            setLoading(false);
          })
          .catch(error => {
            console.error("Error converting user in manual check:", error);
            setLoading(false);
          });
      } else if (!session) {
        console.log("Manual session check - no session found");
        setLoading(false);
      }
    });

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
      setSession(null);
      
      // Call the sign out function
      await signOutUser();
      
      console.log("Sign out completed successfully in useSupabaseAuth");
    } catch (error: any) {
      console.error('Error during sign out in useSupabaseAuth:', error);
      
      // Even if there's an error, ensure the local state is cleared
      setCurrentUser(null);
      setSession(null);
      
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
    session,
    loading,
    signIn,
    signOut,
    updateUserRole
  };
};
