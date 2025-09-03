import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { convertToAppUser } from './auth/userConverter';
import { signInWithEmailPassword, signOutUser, updateUserRole } from './auth/authOperations';
import { cleanupAuthState } from '@/utils/authCleanup';
import { toast } from '@/lib/toast';
import type { Session } from '@supabase/supabase-js';
import { User, UserRole } from '@/types/user';

export const useMultiOrganizationAuth = () => {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    console.log('Setting up multi-org auth state listener');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`Multi-org auth state changed: ${event}`, {
          _type: typeof session,
          value: session ? 'session_exists' : 'undefined'
        });

        if (event === 'SIGNED_IN') {
          if (session?.user) {
            setTimeout(async () => {
              try {
                const appUser = await convertToAppUser(session.user);
                setCurrentUser(appUser);
                
                // Initialize session organization if not set
                if (appUser.organization_id) {
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('session_organization_id')
                    .eq('id', appUser.id)
                    .single();
                  
                  if (!profile?.session_organization_id) {
                    // Set default organization as session organization
                    await supabase
                      .from('profiles')
                      .update({ session_organization_id: appUser.organization_id })
                      .eq('id', appUser.id);
                  }
                }
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
            console.log('User signed in successfully with multi-org support');
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
                
                // Ensure session organization is set for USER_UPDATED too
                if (appUser.organization_id) {
                  console.log('🏢 USER_UPDATED: Checking session organization for user:', appUser.id);
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('session_organization_id')
                    .eq('id', appUser.id)
                    .single();
                  
                  if (!profile?.session_organization_id) {
                    console.log('🏢 USER_UPDATED: Setting session organization to:', appUser.organization_id);
                    const { error: updateError } = await supabase
                      .from('profiles')
                      .update({ session_organization_id: appUser.organization_id })
                      .eq('id', appUser.id);
                    
                    if (updateError) {
                      console.error('❌ USER_UPDATED: Failed to set session organization:', updateError);
                    } else {
                      console.log('✅ USER_UPDATED: Session organization set successfully');
                    }
                  }
                }
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
                
                // Initialize session organization if not set - CRITICAL for RLS policies
                if (appUser.organization_id) {
                  console.log('🏢 INITIAL_SESSION: Checking session organization for user:', appUser.id);
                  const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('session_organization_id')
                    .eq('id', appUser.id)
                    .single();
                  
                  if (profileError) {
                    console.error('❌ INITIAL_SESSION: Error fetching profile:', profileError);
                  }
                  
                  if (!profile?.session_organization_id) {
                    console.log('🏢 INITIAL_SESSION: Setting session organization to:', appUser.organization_id);
                    const { error: updateError } = await supabase
                      .from('profiles')
                      .update({ session_organization_id: appUser.organization_id })
                      .eq('id', appUser.id);
                    
                    if (updateError) {
                      console.error('❌ INITIAL_SESSION: Failed to set session organization:', updateError);
                      // Try alternative method using RPC function
                      console.log('🏢 INITIAL_SESSION: Trying RPC function as fallback...');
                      const { error: rpcError } = await supabase.rpc('switch_user_organization', {
                        new_org_id: appUser.organization_id
                      });
                      
                      if (rpcError) {
                        console.error('❌ INITIAL_SESSION: RPC fallback also failed:', rpcError);
                      } else {
                        console.log('✅ INITIAL_SESSION: Session organization set via RPC fallback');
                      }
                    } else {
                      console.log('✅ INITIAL_SESSION: Session organization set successfully');
                    }
                  } else {
                    console.log('🏢 INITIAL_SESSION: Session organization already set:', profile.session_organization_id);
                  }
                }
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
      console.log('Multi-org manual session check - session found:', !!session);
      if (session?.user) {
        try {
          const appUser = await convertToAppUser(session.user);
          setCurrentUser(appUser);
          
          // Initialize session organization if not set
          if (appUser.organization_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('session_organization_id')
              .eq('id', appUser.id)
              .single();
            
            if (!profile?.session_organization_id) {
              // Set default organization as session organization
              await supabase
                .from('profiles')
                .update({ session_organization_id: appUser.organization_id })
                .eq('id', appUser.id);
            }
          }
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
      console.log('Cleaning up multi-org auth state listener');
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
      console.error('Error in useMultiOrganizationAuth.signIn:', error);
      throw error;
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
      console.log("Starting sign out process in useMultiOrganizationAuth");
      
      // Clear user state immediately to prevent UI issues
      setCurrentUser(null);
      setSession(null);
      
      // Call the sign out function
      await signOutUser();
      
      console.log("Sign out completed successfully in useMultiOrganizationAuth");
    } catch (error: any) {
      console.error('Error during sign out in useMultiOrganizationAuth:', error);
      
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

  // Update user role in specific organization
  const updateUserRoleLocal = async (role: UserRole, organizationId?: string) => {
    if (!currentUser) {
      throw new Error("No user is currently logged in");
    }
    
    console.log("🔑 useMultiOrganizationAuth: Updating user role", {
      userId: currentUser.id,
      currentRole: currentUser.role,
      newRole: role,
      organizationId
    });
    
    setLoading(true);
    try {
      if (organizationId) {
        // Update role in specific organization
        const { error } = await supabase
          .from('user_organizations')
          .update({ role })
          .eq('user_id', currentUser.id)
          .eq('organization_id', organizationId);
        
        if (error) throw error;
      } else {
        // Update role in profiles table (fallback)
        await updateUserRole(currentUser.id, role);
      }
      
      // Update the role locally if it's for current organization
      if (!organizationId || organizationId === currentUser.organization_id) {
        setCurrentUser(prev => prev ? { ...prev, role } : null);
      }
      
      console.log("✅ useMultiOrganizationAuth: Role updated successfully");
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