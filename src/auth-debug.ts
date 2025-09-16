// This file exists to force cache refresh and debug auth issues
console.log('🧨 AUTH DEBUG: Cache refresh marker - v11.0 - TIMEOUT PROTECTION');
console.log('🧨 If you see convertToAppUser being called, there is a cache issue');
console.log('🧨 v11.0: Added timeout protection to prevent hanging on profile queries');

export const authDebugMarker = 'v11.0-timeout-protection';