// This file exists to force cache refresh and debug auth issues
console.log('🧨 AUTH DEBUG: Cache refresh marker - v10.0 - ISOLATED LOADING ISSUE');
console.log('🧨 If you see convertToAppUser being called, there is a cache issue');
console.log('🧨 v10.0: Isolated loading issue by removing organization fetch');

export const authDebugMarker = 'v10.0-isolated-loading-issue';