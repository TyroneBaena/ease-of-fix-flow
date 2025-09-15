
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
    let isInitialized = false;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`Auth state changed: ${event}`, {
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email
        });

        // Handle session persistence and user conversion synchronously where possible
        try {
          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
            if (session?.user) {
              const appUser = await convertToAppUser(session.user);
              setCurrentUser(appUser);
              setSession(session);
              console.log('User authenticated successfully:', session.user.email);
              setLoading(false);
              isInitialized = true;
            } else {
              setCurrentUser(null);
              setSession(null);
              if (event !== 'TOKEN_REFRESHED') {
                setLoading(false);
              }
            }
          } else if (event === 'SIGNED_OUT') {
            setCurrentUser(null);
            setSession(null);
            setIsSigningOut(false);
            setLoading(false);
            
            // Clean up auth state on sign out
            cleanupAuthState();
            isInitialized = true;
          } else if (event === 'USER_UPDATED') {
            if (session?.user) {
              const appUser = await convertToAppUser(session.user);
              setCurrentUser(appUser);
              setSession(session);
              console.log('User updated successfully');
            } else {
              setCurrentUser(null);
              setSession(null);
            }
            setLoading(false);
          }
        } catch (error) {
          console.error(`Error handling auth event ${event}:`, error);
          setCurrentUser(null);
          setSession(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session - this ensures proper loading on refresh
    const checkInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting initial session:', error);
          setLoading(false);
          return;
        }

        // If auth state change already handled this, skip
        if (isInitialized) {
          console.log('Session already handled by auth state change');
          return;
        }

        console.log('Manual session check - session found:', !!session);
        if (session?.user) {
          const appUser = await convertToAppUser(session.user);
          setCurrentUser(appUser);
          setSession(session);
          console.log('Session restored on page load for:', session.user.email);
        } else {
          setCurrentUser(null);
          setSession(null);
        }
      } catch (error) {
        console.error('Error in initial session check:', error);
        setCurrentUser(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    checkInitialSession();

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
    
    console.log("🔑 useSupabaseAuth: Updating user role", {
      userId: currentUser.id,
      currentRole: currentUser.role,
      newRole: role
    });
    
    setLoading(true);
    try {
      const updatedProfile = await updateUserRole(currentUser.id, role);
      if (updatedProfile) {
        // Update the current user with the returned profile data
        setCurrentUser(prev => prev ? { 
          ...prev, 
          role: updatedProfile.role as UserRole,
          name: updatedProfile.name,
          email: updatedProfile.email,
          phone: updatedProfile.phone || prev.phone
        } : null);
      } else {
        // Fallback to local update if no profile returned
        setCurrentUser(prev => prev ? { ...prev, role } : null);
      }
      console.log("✅ useSupabaseAuth: Role updated successfully");
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
