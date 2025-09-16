// This file exists to force cache refresh and debug auth issues
console.log('🧨 AUTH DEBUG: Cache refresh marker - v12.0 - DEADLOCK FIX');
console.log('🧨 If you see convertToAppUser being called, there is a cache issue');
console.log('🧨 v12.0: Fixed Supabase deadlock by using setTimeout for async calls in onAuthStateChange');

export const authDebugMarker = 'v12.0-deadlock-fix';