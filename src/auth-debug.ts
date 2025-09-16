// This file exists to force cache refresh and debug auth issues
console.log('🧨 AUTH DEBUG: Cache refresh marker - v14.0 - CONTRACTOR ROLE BUG FIX');
console.log('🧨 If you see convertToAppUser being called, there is a cache issue');
console.log('🧨 v14.0: Fixed contractor role assignment bug - contractors now get proper organization membership');

export const authDebugMarker = 'v14.0-contractor-role-fix';