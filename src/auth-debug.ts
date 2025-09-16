// This file exists to force cache refresh and debug auth issues
console.log('🧨 AUTH DEBUG: Cache refresh marker - v9.0 - FIXED DUAL PROCESSING CONFLICT');
console.log('🧨 If you see convertToAppUser being called, there is a cache issue');
console.log('🧨 v9.0: Fixed conflict between SIGNED_IN event and initial session check');

export const authDebugMarker = 'v9.0-fixed-dual-processing-conflict';