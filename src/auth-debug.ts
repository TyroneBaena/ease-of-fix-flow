// This file exists to force cache refresh and debug auth issues
console.log('🧨 AUTH DEBUG: Cache refresh marker - v7.0 - FIXED LOADING STATE RACE CONDITION');
console.log('🧨 If you see convertToAppUser being called, there is a cache issue');
console.log('🧨 v7.0: Fixed loading state race condition - set loading false before org fetch');

export const authDebugMarker = 'v7.0-fixed-loading-race-condition';