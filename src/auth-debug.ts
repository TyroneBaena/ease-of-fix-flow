// This file exists to force cache refresh and debug auth issues
console.log('🧨 AUTH DEBUG: Cache refresh marker - v13.0 - LOGIN REDIRECT FIX');
console.log('🧨 If you see convertToAppUser being called, there is a cache issue');
console.log('🧨 v13.0: Fixed Login component interfering with dashboard by only redirecting on /login path');

export const authDebugMarker = 'v13.0-login-redirect-fix';