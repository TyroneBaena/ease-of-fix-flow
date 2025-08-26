/**
 * Authentication cleanup utility to prevent limbo states
 * and ensure clean auth transitions
 */

export const cleanupAuthState = () => {
  console.log('🧹 Cleaning up authentication state');
  
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      console.log(`🧹 Removing localStorage key: ${key}`);
      localStorage.removeItem(key);
    }
  });
  
  // Remove from sessionStorage if in use
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      console.log(`🧹 Removing sessionStorage key: ${key}`);
      sessionStorage.removeItem(key);
    }
  });
  
  console.log('🧹 Authentication state cleanup complete');
};

export const forcePageRefresh = (path: string = '/') => {
  console.log(`🔄 Forcing page refresh to: ${path}`);
  window.location.href = path;
};