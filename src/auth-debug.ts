// This file exists to force cache refresh and debug auth issues
console.log('🧨 AUTH DEBUG: Cache refresh marker - v101.0 - FIXED TAB VISIBILITY + API HANG');
console.log('🧨 v101.0: Fixed profile refetch with useRef, removed sessionVersion dep');
console.log('🧨 v101.0: Fixed MaintenanceRequestProvider infinite loop with max 3 attempts');
console.log('🧨 Profile refetches on tab revisit (>5s), other APIs won\'t hang indefinitely');

export const authDebugMarker = 'v101.0-fixed-tab-visibility-api-hang';