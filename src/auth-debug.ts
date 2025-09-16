// This file exists to force cache refresh and debug auth issues
console.log('🧨 AUTH DEBUG: Cache refresh marker - v6.0 - FIXED LOGIN FLOW');
console.log('🧨 If you see convertToAppUser being called, there is a cache issue');
console.log('🧨 v6.0: Fixed login flow - removed session clearing before sign in');

export const authDebugMarker = 'v6.0-fixed-login-flow';