// This file exists to force cache refresh and debug auth issues
console.log('🧨 AUTH DEBUG: Cache refresh marker - v18.0 - SESSION AVAILABILITY FIX FOR INVITATIONS');
console.log('🧨 If you see convertToAppUser being called, there is a cache issue');
console.log('🧨 v18.0: Fixed invitation forms to wait for both currentUser AND session before enabling');

export const authDebugMarker = 'v18.0-session-availability-fix-invitations';