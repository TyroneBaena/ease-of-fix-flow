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
    
    console.log('Auth state cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up auth state:', error);
  }
};

export const performRobustSignOut = async (supabase: any) => {
  try {
    // Clean up auth state first
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