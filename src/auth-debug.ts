// This file exists to force cache refresh and debug auth issues
console.log('🧨 AUTH DEBUG: Cache refresh marker - v8.0 - FIXED INITIAL SESSION LOADING');
console.log('🧨 If you see convertToAppUser being called, there is a cache issue');
console.log('🧨 v8.0: Fixed initial session loading - set loading false after user conversion');

export const authDebugMarker = 'v8.0-fixed-initial-session-loading';