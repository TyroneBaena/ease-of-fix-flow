// This file exists to force cache refresh and debug auth issues
console.log('🧨 AUTH DEBUG: Cache refresh marker - v15.0 - SIGNOUT TIMEOUT FIX');
console.log('🧨 If you see convertToAppUser being called, there is a cache issue');
console.log('🧨 v15.0: Fixed sign-out hanging issue - added timeouts and robust cleanup');

export const authDebugMarker = 'v15.0-signout-timeout-fix';