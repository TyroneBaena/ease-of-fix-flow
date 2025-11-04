/**
 * Utility for cleaning up authentication state to prevent limbo states
 * and ensure clean auth transitions
 */

export const cleanupAuthState = () => {
  try {
    // Remove standard auth tokens
    localStorage.removeItem('supabase.auth.token');
    
    // Remove all Supabase auth keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    // Remove from sessionStorage if in use
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      });
    }
    
    // CRITICAL v36.1: Also clear cookie backup to prevent restoration
    try {
      document.cookie = "sb-auth-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    } catch (cookieError) {
      console.warn('Error clearing cookie:', cookieError);
    }
    
    console.log('Auth state cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up auth state:', error);
  }
};

export const performRobustSignOut = async (supabase: any) => {
  try {
    // CRITICAL: Clear backup storage FIRST before Supabase signOut
    // This prevents v36.0 backup restoration from re-authenticating the user
    try {
      // Clear cookie backup
      document.cookie = "sb-auth-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      console.log('🔐 Cleared cookie backup');
      
      // Clear sessionStorage backup
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('sb-session-backup');
        console.log('🔐 Cleared sessionStorage backup');
      }
    } catch (storageError) {
      console.error('Error clearing backup storage:', storageError);
    }
    
    // Clean up auth state
    cleanupAuthState();
    
    // Attempt global sign out (fallback if it fails)
    try {
      await supabase.auth.signOut({ scope: 'global' });
      console.log('Global sign out successful');
    } catch (err) {
      console.warn('Global sign out failed, but continuing:', err);
    }
    
    return true;
  } catch (error) {
    console.error('Error during robust sign out:', error);
    return false;
  }
};

export const forcePageRefresh = (path: string = '/') => {
  try {
    console.log(`Forcing page refresh to: ${path}`);
    window.location.href = path;
  } catch (error) {
    console.error('Error forcing page refresh:', error);
    // Fallback to reload
    window.location.reload();
  }
};
