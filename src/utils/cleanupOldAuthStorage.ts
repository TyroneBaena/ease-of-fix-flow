/**
 * Cleanup utility for old v37 localStorage/sessionStorage tokens
 * Run this once to remove zombie auth data from the old backup system
 */

export const cleanupOldAuthStorage = () => {
  try {
    console.log("🧹 Cleaning up old v37 auth storage...");
    
    // Remove old Supabase auth keys from localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase.auth'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🧹 Removed localStorage key: ${key}`);
    });
    
    // Remove from sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      const sessionKeysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase.auth'))) {
          sessionKeysToRemove.push(key);
        }
      }
      
      sessionKeysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
        console.log(`🧹 Removed sessionStorage key: ${key}`);
      });
    }
    
    // Remove old backup cookies
    try {
      document.cookie = "sb-auth-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      console.log("🧹 Removed old backup cookie");
    } catch (cookieError) {
      console.warn('⚠️ Could not clear old cookie:', cookieError);
    }
    
    console.log("✅ Old auth storage cleanup complete");
  } catch (error) {
    console.error('❌ Error cleaning up old auth storage:', error);
  }
};
