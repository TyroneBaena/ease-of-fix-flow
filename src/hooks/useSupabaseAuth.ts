
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { convertToAppUser } from './auth/userConverter';
import { signInWithEmailPassword, signOutUser, updateUserRole } from './auth/authOperations';
import { cleanupAuthState } from '@/utils/authCleanup';
import { toast } from '@/lib/toast';
import type { Session } from '@supabase/supabase-js';
import { User, UserRole } from '@/types/user';

export const useSupabaseAuth = () => {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    console.log('Setting up auth state listener');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`Auth state changed: ${event}`, {
          _type: typeof session,
          value: session ? 'session_exists' : 'undefined'
        });

        if (event === 'SIGNED_IN') {
          if (session?.user) {
            setTimeout(async () => {
              try {
                const appUser = await convertToAppUser(session.user);
                setCurrentUser(appUser);
              } catch (error) {
                console.error('Error converting user:', error);
                setCurrentUser(null);
              }
            }, 0);
          } else {
            setCurrentUser(null);
          }
          setSession(session);
          setLoading(false);
          
          // Defer any additional data fetching to prevent deadlocks
          setTimeout(() => {
            console.log('User signed in successfully');
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setSession(null);
          setIsSigningOut(false);
          setLoading(false);
          
          // Clean up auth state on sign out
          cleanupAuthState();
        } else if (event === 'USER_UPDATED') {
          if (session?.user) {
            setTimeout(async () => {
              try {
                const appUser = await convertToAppUser(session.user);
                setCurrentUser(appUser);
              } catch (error) {
                console.error('Error converting updated user:', error);
              }
            }, 0);
          } else {
            setCurrentUser(null);
          }
          setSession(session);
          setLoading(false);
        } else if (event === 'INITIAL_SESSION') {
          if (session?.user) {
            setTimeout(async () => {
              try {
                const appUser = await convertToAppUser(session.user);
                setCurrentUser(appUser);
              } catch (error) {
                console.error('Error converting user from initial session:', error);
                setCurrentUser(null);
              }
            }, 0);
          } else {
            setCurrentUser(null);
          }
          setSession(session);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('Manual session check - session found:', !!session);
      if (session?.user) {
        try {
          const appUser = await convertToAppUser(session.user);
          setCurrentUser(appUser);
        } catch (error) {
          console.error('Error converting user from manual session check:', error);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setSession(session);
      setLoading(false);
    });

    return () => {
      console.log('Cleaning up auth state listener');
      subscription.unsubscribe();
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
  const updateUserRoleLocal = async (role: UserRole) => {
    if (!currentUser) {
      throw new Error("No user is currently logged in");
    }
    
    setLoading(true);
    try {
      await updateUserRole(currentUser.id, role);
      // Update the role locally since the function doesn't return a user
      setCurrentUser(prev => prev ? { ...prev, role } : null);
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
    updateUserRole: updateUserRoleLocal
  };
};
