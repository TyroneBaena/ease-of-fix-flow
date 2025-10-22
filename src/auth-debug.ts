// This file exists to force cache refresh and debug auth issues
console.log('🧨 AUTH DEBUG: Cache refresh marker - v17.0 - TAB VISIBILITY SESSION REFRESH');
console.log('🧨 If you see convertToAppUser being called, there is a cache issue');
console.log('🧨 v17.0: Added tab visibility detection to refresh expired sessions');

export const authDebugMarker = 'v17.0-tab-visibility-session-refresh';