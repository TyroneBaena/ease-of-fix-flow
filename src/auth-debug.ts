// This file exists to force cache refresh and debug auth issues
console.log('🧨 AUTH DEBUG: Cache refresh marker - v100.0 - TAB VISIBILITY PROFILE REFETCH');
console.log('🧨 Profile data now refetches when tab becomes visible after 5+ seconds');
console.log('🧨 v100.0: Added visibility listener to UnifiedAuthContext for fresh profile data on tab revisit');

export const authDebugMarker = 'v100.0-tab-visibility-profile-refetch';