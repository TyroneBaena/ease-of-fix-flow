// This file exists to force cache refresh and debug auth issues
console.log('🧨 AUTH DEBUG: Cache refresh marker - v16.0 - GETSESSION TIMEOUT FIX');
console.log('🧨 If you see convertToAppUser being called, there is a cache issue');
console.log('🧨 v16.0: Fixed getSession hanging issue - added timeout protection');

export const authDebugMarker = 'v16.0-getsession-timeout-fix';