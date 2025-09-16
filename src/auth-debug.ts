// This file exists to force cache refresh and debug auth issues
console.log('🧨 AUTH DEBUG: Cache refresh marker - v5.0 - FIXED DUPLICATE LISTENERS');
console.log('🧨 If you see convertToAppUser being called, there is a cache issue');
console.log('🧨 v5.0: Fixed critical duplicate auth listeners bug causing session conflicts');

export const authDebugMarker = 'v5.0-fixed-duplicate-listeners';