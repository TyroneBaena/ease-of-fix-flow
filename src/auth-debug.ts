// This file exists to force cache refresh and debug auth issues
console.log('🧨 AUTH DEBUG: Cache refresh marker - v19.0 - PROACTIVE SESSION VALIDATION');
console.log('🧨 If you see convertToAppUser being called, there is a cache issue');
console.log('🧨 v19.0: Added proactive session validation before opening invitation dialogs');

export const authDebugMarker = 'v19.0-proactive-session-validation';