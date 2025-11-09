// import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
// import { supabase } from "@/lib/supabase";
// import { User as SupabaseUser, Session } from "@supabase/supabase-js";
// import { User, UserRole } from "@/types/user";
// import { toast } from "@/lib/toast";
// import { authDebugMarker } from "@/auth-debug";
// import "@/auth-debug"; // Force import to trigger debug logs
// import { setSentryUser } from "@/lib/sentry";
// import { visibilityCoordinator } from "@/utils/visibilityCoordinator";

// console.log("🚀 UnifiedAuth Context loading with debug marker:", authDebugMarker);

// // Helper: Wrap any promise with a timeout to prevent indefinite hangs
// // Used to protect PATH 2 (getSession fallback) from network hangs after multiple tab revisits
// function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
//   return Promise.race([
//     promise,
//     new Promise<T>((_, reject) =>
//       setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
//     ),
//   ]);
// }

// // Import the full AddUserResult interface
// export interface AddUserResult {
//   success: boolean;
//   message: string;
//   userId?: string;
//   emailSent?: boolean;
//   emailError?: string;
//   testMode?: boolean;
//   testModeInfo?: string;
//   isNewUser?: boolean;
//   isExistingUserAddedToOrg?: boolean;
//   email?: string;
// }

// // Organization types
// interface Organization {
//   id: string;
//   name: string;
//   slug: string;
//   created_at: string;
//   updated_at: string;
//   created_by: string | null;
//   settings: any;
// }

// interface UserOrganization {
//   id: string;
//   user_id: string;
//   organization_id: string;
//   role: string;
//   is_active: boolean;
//   is_default: boolean;
//   created_at: string;
//   updated_at: string;
//   organization: Organization;
// }

// interface UnifiedAuthContextType {
//   // Simple auth properties
//   currentUser: User | null;
//   session: Session | null;
//   loading: boolean;
//   isInitialized: boolean; // Track if initial auth check is complete
//   isSessionReady: boolean; // CRITICAL: Track if Supabase client session is fully propagated and ready for queries
//   isSigningOut: boolean; // Track sign out process to prevent UI flashing
//   signOut: () => Promise<void>;

//   // Multi-organization properties
//   currentOrganization: Organization | null;
//   userOrganizations: UserOrganization[];
//   switchOrganization: (organizationId: string) => Promise<void>;
//   refreshOrganizations: () => Promise<void>;
//   getCurrentUserRole: () => string;

//   // Admin helper
//   isAdmin: boolean;
//   canAccessProperty: (propertyId: string) => boolean;

//   // User management
//   users: User[];
//   fetchUsers: () => Promise<void>;
//   addUser: (email: string, name: string, role: UserRole, assignedProperties?: string[]) => Promise<AddUserResult>;
//   updateUser: (user: User) => Promise<void>;
//   removeUser: (userId: string) => Promise<void>;
//   resetPassword: (userId: string, email: string) => Promise<{ success: boolean; message: string }>;
//   adminResetPassword: (userId: string, email: string) => Promise<{ success: boolean; message: string }>;
// }

// const UnifiedAuthContext = createContext<UnifiedAuthContextType | undefined>(undefined);

// export const useUnifiedAuth = () => {
//   const context = useContext(UnifiedAuthContext);
//   if (!context) {
//     throw new Error("useUnifiedAuth must be used within a UnifiedAuthProvider");
//   }
//   return context;
// };

// // Compatibility hooks for existing components
// export const useSimpleAuth = () => {
//   const context = useUnifiedAuth();
//   return {
//     currentUser: context.currentUser,
//     session: context.session,
//     loading: context.loading,
//     isInitialized: context.isInitialized,
//     isSessionReady: context.isSessionReady,
//     isSigningOut: context.isSigningOut,
//     signOut: context.signOut,
//     isAdmin: context.isAdmin,
//     switchOrganization: context.switchOrganization,
//     refreshUser: context.refreshOrganizations, // Map to available method
//     currentOrganization: context.currentOrganization,
//   };
// };

// export const useMultiOrganizationContext = () => {
//   const context = useUnifiedAuth();
//   return {
//     currentOrganization: context.currentOrganization,
//     userOrganizations: context.userOrganizations,
//     loading: context.loading,
//     error: null, // For compatibility
//     switchOrganization: context.switchOrganization,
//     refreshOrganizations: context.refreshOrganizations,
//     getCurrentUserRole: context.getCurrentUserRole,
//     currentUser: context.currentUser,
//   };
// };

// export const useUserContext = () => {
//   const context = useUnifiedAuth();
//   return {
//     currentUser: context.currentUser,
//     users: context.users,
//     loading: context.loading,
//     loadingError: null,
//     fetchUsers: context.fetchUsers,
//     addUser: context.addUser,
//     updateUser: context.updateUser,
//     removeUser: context.removeUser,
//     resetPassword: context.resetPassword,
//     adminResetPassword: context.adminResetPassword,
//     isAdmin: context.isAdmin,
//     canAccessProperty: context.canAccessProperty,
//     signOut: context.signOut,
//   };
// };

// // Deduplication flag to prevent multiple simultaneous conversions
// let isConverting = false;
// let conversionPromise: Promise<User> | null = null;

// // Simple user conversion with timeout and deduplication
// const convertSupabaseUser = async (supabaseUser: SupabaseUser): Promise<User> => {
//   // CRITICAL: Prevent duplicate conversions
//   if (isConverting && conversionPromise) {
//     console.log("🔄 UnifiedAuth v51.0 - Deduplicating convertSupabaseUser call");
//     return conversionPromise;
//   }

//   isConverting = true;

//   conversionPromise = (async () => {
//     try {
//       console.log("🔄 v79.2 - UnifiedAuth: convertSupabaseUser called for:", supabaseUser.email);

//     try {
//       const { data: profile, error: profileError } = await supabase
//         .from("profiles")
//         .select("*")
//         .eq("id", supabaseUser.id)
//         .maybeSingle();

//       if (profileError) {
//         console.warn("🔄 v79.2 - Profile query error:", profileError.message);
//       }

//       console.log("🔄 v79.2 - Profile query completed:", {
//         hasProfile: !!profile,
//         hasOrganization: !!profile?.organization_id,
//         error: profileError?.message,
//       });

//       // Create user object with fallbacks - always succeed
//       const user: User = {
//         id: supabaseUser.id,
//         email: supabaseUser.email || "",
//         name: profile?.name || supabaseUser.user_metadata?.name || supabaseUser.email?.split("@")[0] || "User",
//         role: (profile?.role as UserRole) || "manager",
//         assignedProperties: profile?.assigned_properties || [],
//         createdAt: profile?.created_at || supabaseUser.created_at,
//         organization_id: profile?.organization_id || null,
//         session_organization_id: profile?.session_organization_id || null,
//       };

//       console.log("🔄 UnifiedAuth v50.0 - User converted successfully:", {
//         id: user.id,
//         email: user.email,
//         name: user.name,
//         role: user.role,
//         organization_id: user.organization_id,
//         session_organization_id: user.session_organization_id,
//         needsOnboarding: !user.organization_id,
//       });

//       return user;
//     } catch (queryError: any) {
//       if (queryError.name === "AbortError") {
//         console.warn("🔄 v79.2 - Profile query timed out, using fallback");
//       } else {
//         console.error("🔄 v79.2 - Profile query failed:", queryError);
//       }

//       // Return basic user on timeout/error
//       return {
//         id: supabaseUser.id,
//         email: supabaseUser.email || "",
//         name: supabaseUser.email?.split("@")[0] || "User",
//         role: "manager" as UserRole,
//         assignedProperties: [],
//         createdAt: supabaseUser.created_at,
//         organization_id: null,
//         session_organization_id: null,
//       };
//     }
//   } catch (error) {
//     console.error("🔄 UnifiedAuth v50.0 - Error converting user:", error);
//     // Return basic user on error
//     const fallbackUser = {
//       id: supabaseUser.id,
//       email: supabaseUser.email || "",
//       name: supabaseUser.email?.split("@")[0] || "User",
//       role: "manager" as UserRole,
//       assignedProperties: [],
//       createdAt: supabaseUser.created_at,
//       organization_id: null,
//       session_organization_id: null,
//     };

//     console.log("🔄 UnifiedAuth v50.0 - Returning fallback user:", fallbackUser);
//     return fallbackUser;
//   } finally {
//     isConverting = false;
//     conversionPromise = null;
//   }
// })();

//   return conversionPromise;
// };

// export const UnifiedAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const [currentUser, setCurrentUser] = useState<User | null>(null);
//   const [session, setSession] = useState<Session | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [isSessionReady, setIsSessionReady] = useState(false); // CRITICAL: Track if Supabase client session is ready
//   const initialCheckDone = useRef(false); // CRITICAL: Use ref to prevent reset on remount
//   const [isSigningOut, setIsSigningOut] = useState(false);
//   const hasCompletedInitialSetup = useRef(false);

//   // v79.0: REMOVED - No error handler needed, React Query handles all errors

//   // Organization state
//   const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
//   const [userOrganizations, setUserOrganizations] = useState<UserOrganization[]>([]);

//   // User management state
//   const [users, setUsers] = useState<User[]>([]);

//   // v51.0: Deduplication tracking
//   const deduplicationRef = useRef({ isConverting: false, promise: null as Promise<User> | null });

//   // CRITICAL: Create refs to hold current session/user for visibility coordinator
//   // These refs are updated whenever session/user changes to prevent stale closures
//   const sessionRef = useRef<Session | null>(null);
//   const currentUserRef = useRef<User | null>(null);

//   const signOut = useCallback(async () => {
//     try {
//       console.log("🔐 UnifiedAuth - Starting sign out process");

//       // Set signing out flag FIRST to prevent UI flashing during cleanup
//       setIsSigningOut(true);

//       // Clear Sentry user context immediately
//       setSentryUser(null);

//       // Import auth cleanup utilities
//       const { performRobustSignOut } = await import("@/utils/authCleanup");

//       // Perform robust sign out with timeout
//       const signOutPromise = performRobustSignOut(supabase);
//       const timeoutPromise = new Promise(
//         (resolve) =>
//           setTimeout(() => {
//             console.warn("🔐 UnifiedAuth - Sign out timeout, forcing cleanup");
//             resolve(true);
//           }, 5000), // 5 second timeout
//       );

//       await Promise.race([signOutPromise, timeoutPromise]);

//       // Clear local state immediately
//       setCurrentUser(null);
//       setSession(null);
//       setIsSessionReady(false); // Clear session ready flag
//       setUserOrganizations([]);
//       setCurrentOrganization(null);

//       console.log("🔐 UnifiedAuth - Sign out completed successfully");
//       toast.success("Signed out successfully");
//     } catch (error) {
//       console.error("🔐 UnifiedAuth - Error signing out:", error);

//       // Even on error, clear local state
//       setCurrentUser(null);
//       setSession(null);
//       setUserOrganizations([]);
//       setCurrentOrganization(null);

//       toast.error("Error signing out");
//     }
//   }, []);

//   const fetchUserOrganizations = async (user: User) => {
//     if (!user?.id) {
//       console.log("UnifiedAuth - No user ID, clearing organizations");
//       setUserOrganizations([]);
//       setCurrentOrganization(null);
//       return null;
//     }

//     try {
//       console.log("UnifiedAuth - Fetching organizations for user:", user.id);

//       try {
//         // Fetch user organizations
//         const { data: userOrgs, error: userOrgsError } = await supabase
//           .from("user_organizations")
//           .select(
//             `
//             *,
//             organization_id,
//             role,
//             is_active,
//             is_default
//           `,
//           )
//           .eq("user_id", user.id)
//           .eq("is_active", true);

//         if (userOrgsError) {
//           console.warn("UnifiedAuth - Error fetching user organizations:", userOrgsError);
//           throw userOrgsError;
//         }

//         if (!userOrgs || userOrgs.length === 0) {
//           console.log("UnifiedAuth - No organizations found, using profile organization_id");
//           setUserOrganizations([]);
//           setCurrentOrganization(null);
//           return user.organization_id || null;
//         }

//         // Fetch organization details
//         const orgIds = userOrgs.map((uo: any) => uo.organization_id);

//         const { data: organizations, error: orgsError } = await supabase
//           .from("organizations")
//           .select("*")
//           .in("id", orgIds);

//         if (orgsError) {
//           console.warn("UnifiedAuth - Error fetching organizations:", orgsError);
//           throw orgsError;
//         }

//         const mappedUserOrganizations = userOrgs
//           .map((uo: any) => {
//             const organization = organizations?.find((org) => org.id === uo.organization_id);
//             return {
//               ...uo,
//               organization: organization as Organization,
//             };
//           })
//           .filter((uo: any) => uo.organization);

//         setUserOrganizations(mappedUserOrganizations);

//         // Set current organization (prefer session, then default, then first)
//         if (mappedUserOrganizations.length > 0) {
//           let targetOrg: Organization | null = null;

//           // Try session organization first
//           if (user.session_organization_id) {
//             const sessionOrg = mappedUserOrganizations.find(
//               (uo: any) => uo.organization_id === user.session_organization_id,
//             );
//             if (sessionOrg) {
//               targetOrg = sessionOrg.organization;
//             }
//           }

//           // Fallback to default organization
//           if (!targetOrg) {
//             const defaultOrg = mappedUserOrganizations.find((uo: any) => uo.is_default);
//             if (defaultOrg) {
//               targetOrg = defaultOrg.organization;
//             }
//           }

//           // Final fallback to first organization
//           if (!targetOrg) {
//             targetOrg = mappedUserOrganizations[0].organization;
//           }

//           setCurrentOrganization(targetOrg);
//           console.log("UnifiedAuth - Set current organization:", targetOrg?.name);
//           return targetOrg?.id || null;
//         }

//         return user.organization_id || null;
//       } catch (fetchError) {
//         throw fetchError;
//       }
//     } catch (error) {
//       console.error("UnifiedAuth - Error in fetchUserOrganizations:", error);
//       // Only clear if it's not a timeout - preserve existing data on timeout
//       if (!(error instanceof Error && error.message === "Organization fetch timeout")) {
//         setUserOrganizations([]);
//         setCurrentOrganization(null);
//       }
//       return user.organization_id || null;
//     }
//   };

//   const switchOrganization = useCallback(
//     async (organizationId: string) => {
//       try {
//         const targetOrgData = userOrganizations.find((uo) => uo.organization_id === organizationId);

//         if (!targetOrgData) {
//           throw new Error("Organization not found");
//         }

//         // Call the database function to switch organization
//         const { error } = await supabase.rpc("switch_user_organization", {
//           new_org_id: organizationId,
//         });

//         if (error) {
//           throw new Error(`Failed to switch organization: ${error.message}`);
//         }

//         setCurrentOrganization(targetOrgData.organization);
//         toast.success(`Switched to ${targetOrgData.organization.name}`);
//       } catch (error) {
//         console.error("Error switching organization:", error);
//         toast.error("Failed to switch organization");
//       }
//     },
//     [userOrganizations],
//   );

//   const refreshOrganizations = useCallback(async () => {
//     if (!currentUser?.id) return;

//     try {
//       console.log("🔄 Refreshing user data and organizations...");

//       // Refetch user profile to get updated role
//       const {
//         data: { user: authUser },
//       } = await supabase.auth.getUser();
//       if (!authUser) return;

//       // Convert to User type with fresh data
//       const freshUser = await convertSupabaseUser(authUser);
//       if (freshUser) {
//         setCurrentUser(freshUser);
//         // Fetch organizations with the fresh user data
//         await fetchUserOrganizations(freshUser);
//       }

//       console.log("✅ User data and organizations refreshed");
//     } catch (error) {
//       console.error("Error refreshing user data:", error);
//     }
//   }, [currentUser?.id]);

//   const getCurrentUserRole = useCallback((): string => {
//     if (!currentOrganization || !currentUser?.id) {
//       return currentUser?.role || "manager";
//     }

//     const userOrg = userOrganizations.find((uo) => uo.organization_id === currentOrganization.id);

//     return userOrg?.role || currentUser?.role || "manager";
//   }, [currentOrganization?.id, currentUser?.id, currentUser?.role, userOrganizations]);

//   // Use organization role when available, fallback to profile role
//   // CRITICAL: Memoize effectiveRole to prevent infinite re-renders
//   const effectiveRole = useMemo(() => {
//     if (!currentUser) return "manager";

//     // If user has organizations, use the organization role
//     if (currentOrganization && userOrganizations.length > 0) {
//       const userOrg = userOrganizations.find((uo) => uo.organization_id === currentOrganization.id);
//       if (userOrg) {
//         return userOrg.role;
//       }
//     }

//     // Fallback to profile role
//     return currentUser.role || "manager";
//   }, [currentUser?.id, currentUser?.role, currentOrganization?.id, userOrganizations]);

//   const isAdmin = useMemo(() => effectiveRole === "admin", [effectiveRole]);

//   const canAccessProperty = useCallback(
//     (propertyId: string): boolean => {
//       if (!currentUser) return false;
//       if (effectiveRole === "admin") return true;
//       return currentUser.assignedProperties?.includes(propertyId) || false;
//     },
//     [currentUser?.id, currentUser?.assignedProperties, effectiveRole],
//   );

//   // Create enhanced currentUser with effective role
//   // CRITICAL: Only create new object if actual values changed
//   const enhancedCurrentUser = useMemo(() => {
//     if (!currentUser) return null;

//     // If role matches, return the same object to prevent unnecessary re-renders
//     if (currentUser.role === effectiveRole) {
//       return currentUser;
//     }

//     // Only create new object if role actually changed
//     return {
//       ...currentUser,
//       role: effectiveRole as UserRole,
//     };
//   }, [currentUser, effectiveRole]); // Simplified deps - only recompute if currentUser or role changes

//   // User management functions
//   const fetchUsers = useCallback(async () => {
//     console.log(
//       "UnifiedAuth - fetchUsers called, effectiveRole:",
//       effectiveRole,
//       "currentOrganization:",
//       !!currentOrganization,
//     );

//     const isAdminRole = effectiveRole === "admin";

//     if (!isAdminRole) {
//       console.log("UnifiedAuth - Not fetching users (not admin)");
//       return;
//     }

//     try {
//       console.log("UnifiedAuth - Fetching users for practice leader dropdown");
//       const { fetchAllUsers } = await import("@/services/user/userQueries");

//       try {
//         const userData = await fetchAllUsers();

//         console.log("UnifiedAuth - Raw user data received:", userData.length, "users");

//         // Convert to User type format
//         const convertedUsers = userData.map((user) => ({
//           id: user.id,
//           name: user.name,
//           email: user.email,
//           role: user.role,
//           assignedProperties: user.assignedProperties || [],
//           createdAt: user.createdAt,
//           organization_id: user.organization_id,
//         }));

//         console.log("UnifiedAuth - Converted users:", convertedUsers);
//         setUsers(convertedUsers);
//         console.log("UnifiedAuth - Users set for practice leaders:", convertedUsers.length);
//       } catch (fetchError) {
//         throw fetchError;
//       }
//     } catch (error) {
//       console.error("UnifiedAuth - Error fetching users:", error);
//       if (error instanceof Error && (error.message.includes("aborted") || error.message.includes("timeout"))) {
//         console.warn("⏱️ User fetch aborted due to timeout");
//       }
//     }
//   }, [effectiveRole]);

//   const addUser = useCallback(
//     async (email: string, name: string, role: UserRole, assignedProperties?: string[]): Promise<AddUserResult> => {
//       // Basic implementation - would be replaced with actual service call
//       console.log("addUser called:", { email, name, role, assignedProperties });
//       return {
//         success: false,
//         message: "User management not fully implemented yet",
//         email,
//       };
//     },
//     [],
//   );

//   const updateUser = useCallback(async (user: User) => {
//     console.log("updateUser called:", user);
//   }, []);

//   const removeUser = useCallback(async (userId: string) => {
//     console.log("removeUser called:", userId);
//   }, []);

//   const resetPassword = useCallback(async (userId: string, email: string) => {
//     console.log("resetPassword called:", { userId, email });
//     try {
//       // Use production URL if on production, otherwise use current origin
//       const isProduction =
//         window.location.hostname === "housinghub.app" || window.location.hostname === "www.housinghub.app";
//       const redirectUrl = isProduction
//         ? `https://housinghub.app/setup-password?email=${encodeURIComponent(email)}`
//         : `${window.location.origin}/setup-password?email=${encodeURIComponent(email)}`;

//       const { error } = await supabase.auth.resetPasswordForEmail(email, {
//         redirectTo: redirectUrl,
//       });

//       if (error) {
//         console.error("Error requesting password reset:", error);
//         return {
//           success: false,
//           message: error.message || "Password reset failed",
//         };
//       }

//       return {
//         success: true,
//         message: `Password reset email sent to ${email}`,
//       };
//     } catch (error: any) {
//       console.error("Error in resetPassword:", error);
//       return {
//         success: false,
//         message: error.message || "Unknown error occurred",
//       };
//     }
//   }, []);

//   const adminResetPassword = useCallback(async (userId: string, email: string) => {
//     console.log("adminResetPassword called:", { userId, email });
//     try {
//       // Use production URL if on production, otherwise use current origin
//       const isProduction =
//         window.location.hostname === "housinghub.app" || window.location.hostname === "www.housinghub.app";
//       const redirectUrl = isProduction
//         ? `https://housinghub.app/setup-password?email=${encodeURIComponent(email)}`
//         : `${window.location.origin}/setup-password?email=${encodeURIComponent(email)}`;

//       const { error } = await supabase.auth.resetPasswordForEmail(email, {
//         redirectTo: redirectUrl,
//       });

//       if (error) {
//         console.error("Error requesting admin password reset:", error);
//         return {
//           success: false,
//           message: error.message || "Password reset failed",
//         };
//       }

//       return {
//         success: true,
//         message: `Password reset email sent to ${email}`,
//       };
//     } catch (error: any) {
//       console.error("Error in adminResetPassword:", error);
//       return {
//         success: false,
//         message: error.message || "Unknown error occurred",
//       };
//     }
//   }, []);

//   // CRITICAL: Update refs whenever session or currentUser changes
//   useEffect(() => {
//     sessionRef.current = session;
//     currentUserRef.current = currentUser;
//   }, [session, currentUser]);

//   // Helper: Wrap async operations with timeout protection
//   const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> => {
//     return Promise.race([
//       promise,
//       new Promise<T>((_, reject) => {
//         setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
//       }),
//     ]);
//   };

//   // Register auth refresh with visibility coordinator
//   // v66.0: Dual-path session restoration - /session endpoint → supabase.auth.getSession() fallback
//   useEffect(() => {
//     const refreshAuth = async (): Promise<boolean> => {
//       console.log("%c════════════════════════════════════════════════════════", "color: blue; font-weight: bold");
//       console.log("%c🔄 UnifiedAuth v66.0 - DUAL-PATH SESSION RESTORATION START", "color: blue; font-weight: bold");
//       console.log("%c════════════════════════════════════════════════════════", "color: blue; font-weight: bold");

//       try {
//         // PATH 1: Try /session endpoint (cookie-based) with 15s timeout
//         console.log("📍 v66.0 - PATH 1: Attempting /session endpoint...");
//         const { rehydrateSessionFromServer } = await import("@/utils/sessionRehydration");

//         const result = await rehydrateSessionFromServer();

//         if (result.success) {
//           console.log("✅ v66.0 - PATH 1 SUCCESS: Session restored from /session endpoint");

//           // Verify session was set in client
//           const { data: { session: clientSession } } = await supabase.auth.getSession();

//           if (clientSession?.access_token) {
//             console.log("✅ v66.0 - Session verified in client after /session restoration");
//             setIsSessionReady(true);
//             console.log("%c════════════════════════════════════════════════════════", "color: lime; font-weight: bold");
//             console.log("%c✅ v66.0 - DUAL-PATH SUCCESS via PATH 1 (/session)", "color: lime; font-weight: bold");
//             console.log("%c════════════════════════════════════════════════════════", "color: lime; font-weight: bold");
//             return true;
//           }
//         }

//         // PATH 1 FAILED - Log reason and try PATH 2
//         console.warn("⚠️ v66.0 - PATH 1 FAILED:", result.reason || 'unknown');
//         console.log("📍 v66.0 - PATH 2: Attempting supabase.auth.getSession() fallback...");

//         // PATH 2: Fallback to supabase.auth.getSession() with 10s timeout protection
//         // Critical: This internal network call can hang indefinitely after 2-3 tab revisits
//         const { data: { session: fallbackSession }, error: fallbackError } = await withTimeout(
//           supabase.auth.getSession(),
//           10000, // 10 second timeout (fits within 18s handler budget)
//           "PATH 2 (getSession) timed out after 10s"
//         ).catch((timeoutError) => {
//           console.error("❌ v66.0 - PATH 2 TIMEOUT:", timeoutError.message);
//           return { data: { session: null }, error: timeoutError };
//         });

//         if (fallbackError) {
//           console.error("❌ v66.0 - PATH 2 ERROR:", fallbackError.message);
//           console.log("%c════════════════════════════════════════════════════════", "color: red; font-weight: bold");
//           console.log("%c❌ v66.0 - DUAL-PATH FAILED: Both paths exhausted", "color: red; font-weight: bold");
//           console.log("%c════════════════════════════════════════════════════════", "color: red; font-weight: bold");
//           setIsSessionReady(false);
//           return false;
//         }

//         if (fallbackSession?.access_token) {
//           console.log("✅ v66.0 - PATH 2 SUCCESS: Session found via getSession()");
//           console.log("✅ v66.0 - Session user:", fallbackSession.user?.email);
//           console.log("✅ v66.0 - Session expires:", new Date(fallbackSession.expires_at! * 1000).toISOString());
//           setIsSessionReady(true);
//           console.log("%c════════════════════════════════════════════════════════", "color: lime; font-weight: bold");
//           console.log("%c✅ v66.0 - DUAL-PATH SUCCESS via PATH 2 (getSession)", "color: lime; font-weight: bold");
//           console.log("%c════════════════════════════════════════════════════════", "color: lime; font-weight: bold");
//           return true;
//         }

//         // Both paths failed - no session available
//         console.warn("⚠️ v66.0 - PATH 2: No session found in client");
//         console.log("%c════════════════════════════════════════════════════════", "color: red; font-weight: bold");
//         console.log("%c❌ v66.0 - DUAL-PATH FAILED: No valid session in either path", "color: red; font-weight: bold");
//         console.log("%c════════════════════════════════════════════════════════", "color: red; font-weight: bold");
//         setIsSessionReady(false);
//         return false;

//       } catch (error) {
//         console.error("❌ v66.0 - DUAL-PATH CRITICAL ERROR:", error);
//         console.log("%c════════════════════════════════════════════════════════", "color: red; font-weight: bold");
//         console.log("%c❌ v66.0 - DUAL-PATH FAILED: Exception thrown", "color: red; font-weight: bold");
//         console.log("%c════════════════════════════════════════════════════════", "color: red; font-weight: bold");
//         setIsSessionReady(false);
//         return false;
//       }
//     };

//     // DISABLED v77.3: Auth refresh now happens automatically via onAuthStateChange
//     // Manual refresh via coordinator was causing duplicate session restoration attempts
//     // React Query + auth listener is sufficient for tab revisits
//     // const unregister = visibilityCoordinator.onRefresh(refreshAuth);
//     console.log("🔄 UnifiedAuth v77.3 - DISABLED manual auth refresh (relying on auth listener + React Query)");

//     return () => {
//       // unregister();
//       console.log("🔄 UnifiedAuth v77.3 - Cleanup: No coordinator registration to unregister");
//     };
//   }, []);

//   useEffect(() => {
//     console.log("🚀 UnifiedAuth v60.0 - Starting auth initialization (cookie-based) at:", new Date().toISOString());
//     const startTime = performance.now();
//     console.log("🚀 UnifiedAuth v60.0 - Setting up SINGLE auth listener", { authDebugMarker });

//     // Set up ONE auth state listener - this is the ONLY place that calls convertSupabaseUser
//     const {
//       data: { subscription },
//     } = supabase.auth.onAuthStateChange((event, session) => {
//       console.log("🚀 UnifiedAuth v60.0 - Auth state changed:", event, "Session exists:", !!session);

//       if (event === "SIGNED_IN" && session?.user) {
//         console.log("🚀 UnifiedAuth v60.0 - SIGNED_IN event, user email:", session.user.email);

//         // Set session immediately (non-async)
//         setSession(session);
//         console.log("🚀 UnifiedAuth v60.0 - Session set, starting user conversion...");

//         // CRITICAL FIX: Use setTimeout to defer async Supabase calls to prevent deadlocks
//         // This is the official Supabase recommendation to avoid auth callback deadlocks
//         setTimeout(async () => {
//           try {
//             console.log("🚀 UnifiedAuth v60.0 - Starting deferred user conversion...");
//             const user = await convertSupabaseUser(session.user);
//             console.log("🚀 UnifiedAuth v60.0 - User converted:", user.email, "org_id:", user.organization_id);

//             // CRITICAL: Set user first so components can start rendering
//             setCurrentUser(user);
//             console.log("🚀 UnifiedAuth v60.0 - User set, marking auth as loaded");

//             // CRITICAL FIX v60.0: Set session ready BEFORE loading becomes false
//             setIsSessionReady(true);
//             console.log("✅ UnifiedAuth v60.0 - Session ready after SIGNED_IN");

//             // Mark loading as false AFTER session ready (prevents query race condition)
//             setLoading(false);

//             // Set Sentry user context
//             setSentryUser({
//               id: user.id,
//               email: user.email,
//               name: user.name,
//               role: user.role,
//             });

//             // Fetch organizations in background WITHOUT blocking UI
//             fetchUserOrganizations(user).catch((orgError) => {
//               console.warn("🚀 UnifiedAuth v60.0 - Non-critical org fetch error:", orgError);
//             });
//           } catch (error) {
//             console.error("🚀 UnifiedAuth v60.0 - Error in deferred user conversion:", error);
//             setCurrentUser(null);
//             setSession(null);
//             setIsSessionReady(false);
//             setLoading(false);

//             // Clear Sentry user context on error
//             setSentryUser(null);
//           }
//         }, 0);
//       } else if (event === "SIGNED_OUT") {
//         console.log("🚀 UnifiedAuth v60.0 - SIGNED_OUT event");
//         setLoading(false);
//         setCurrentUser(null);
//         setSession(null);
//         setIsSessionReady(false); // Clear session ready flag
//         setUserOrganizations([]);
//         setCurrentOrganization(null);
//         setIsSigningOut(false); // Clear signing out flag

//         // Clear Sentry user context
//         setSentryUser(null);
//       } else if (event === "TOKEN_REFRESHED" && session) {
//         console.log(
//           "🚀 UnifiedAuth v60.0 - TOKEN_REFRESHED event - No action needed, Supabase handles tokens internally",
//         );
//         // CRITICAL FIX: Do NOT update session state on TOKEN_REFRESHED
//         // Supabase client handles token refresh internally and maintains the real session
//         // Updating our state snapshot here causes unnecessary re-renders and loading flashes
//         // Our session state is just a reference - Supabase keeps it valid automatically
//       } else if (event === "USER_UPDATED" && session?.user) {
//         console.log("🚀 UnifiedAuth v60.0 - USER_UPDATED event");
//         // Use setTimeout for USER_UPDATED as well
//         setTimeout(async () => {
//           try {
//             const user = await convertSupabaseUser(session.user);
//             setCurrentUser(user);
//             setSession(session);

//             // Update Sentry user context
//             setSentryUser({
//               id: user.id,
//               email: user.email,
//               name: user.name,
//               role: user.role,
//             });

//             await fetchUserOrganizations(user);
//           } catch (error) {
//             console.error("🚀 UnifiedAuth v60.0 - Error converting updated user:", error);
//           }
//         }, 0);
//       } else if (event === "INITIAL_SESSION") {
//         // CRITICAL FIX: Process session if it exists (e.g., from App.tsx rehydration)
//         console.log("🚀 UnifiedAuth v60.0 - INITIAL_SESSION event, session exists:", !!session);

//         if (session?.user) {
//           console.log("🚀 UnifiedAuth v60.0 - INITIAL_SESSION has session, processing user...");
//           setSession(session);

//           setTimeout(async () => {
//             try {
//               const user = await convertSupabaseUser(session.user);
//               setCurrentUser(user);

//               // CRITICAL FIX v60.0: Set session ready BEFORE loading becomes false
//               setIsSessionReady(true);
//               console.log("✅ UnifiedAuth v60.0 - INITIAL_SESSION processed, session ready immediately");

//               setLoading(false);
//               initialCheckDone.current = true;
//               hasCompletedInitialSetup.current = true;

//               fetchUserOrganizations(user).catch(console.warn);
//             } catch (error) {
//               console.error("❌ UnifiedAuth v60.0 - Error processing INITIAL_SESSION:", error);
//               setCurrentUser(null);
//               setSession(null);
//               setIsSessionReady(false);
//               setLoading(false);
//             }
//           }, 0);
//         } else {
//           // No session yet - wait for getSession()
//           console.log("🚀 UnifiedAuth v60.0 - INITIAL_SESSION without session, waiting for getSession()");
//         }
//       } else {
//         console.log("🚀 UnifiedAuth v60.0 - Other auth event:", event);
//         setLoading(false);
//       }
//     });

//     // THEN get initial session with timeout protection
//     const sessionTimeout = setTimeout(() => {
//       const timeElapsed = ((performance.now() - startTime) / 1000).toFixed(2);
//       console.error(`🚀 UnifiedAuth v60.0 - getSession() timeout after ${timeElapsed}s! Forcing loading to false`);
//       setLoading(false);
//       initialCheckDone.current = true;
//       toast.error("Authentication initialization timed out. Please refresh the page.");
//     }, 8000); // 8 second max for getSession

//     supabase.auth
//       .getSession()
//       .then(({ data: { session } }) => {
//         clearTimeout(sessionTimeout); // Clear timeout if successful
//         const timeElapsed = ((performance.now() - startTime) / 1000).toFixed(2);
//         console.log(
//           `🚀 UnifiedAuth v60.0 - Initial session check completed in ${timeElapsed}s:`,
//           session ? "Found session for " + session.user?.email : "No session",
//         );

//         if (session?.user) {
//           // Set session immediately (non-async)
//           setSession(session);
//           console.log("🚀 UnifiedAuth v60.0 - Initial session set, starting user data load");

//           // Use setTimeout to defer async calls for initial session too
//           setTimeout(async () => {
//             try {
//               console.log("🚀 UnifiedAuth v60.0 - Processing initial session for:", session.user.email);
//               const user = await convertSupabaseUser(session.user);
//               console.log(
//                 "🚀 UnifiedAuth v60.0 - Initial user converted:",
//                 user.email,
//                 "org_id:",
//                 user.organization_id,
//               );

//               // CRITICAL: Set user and session ready FIRST
//               setCurrentUser(user);

//               // CRITICAL FIX v60.0: Set session ready BEFORE loading becomes false (prevents query race)
//               setIsSessionReady(true);
//               console.log("✅ UnifiedAuth v60.0 - Session ready immediately after getSession()");

//               // Mark as complete AFTER session ready
//               setLoading(false);
//               initialCheckDone.current = true;
//               hasCompletedInitialSetup.current = true; // Mark that we've successfully initialized
//               console.log("🚀 UnifiedAuth v60.0 - Initial auth complete");

//               // Fetch organizations in background WITHOUT blocking UI
//               fetchUserOrganizations(user).catch((orgError) => {
//                 console.error("🚀 UnifiedAuth v60.0 - Non-critical org error on initial load:", orgError);
//               });
//             } catch (error) {
//               console.error("🚀 UnifiedAuth v60.0 - Error converting initial user:", error);
//               setCurrentUser(null);
//               setSession(null);
//               setIsSessionReady(false);
//               setLoading(false);
//               initialCheckDone.current = true;
//             }
//           }, 0);
//         } else {
//           // No session - App.tsx will handle HttpOnly rehydration
//           console.log("🚀 UnifiedAuth v60.0 - No session in client, App.tsx will handle cookie rehydration");
//           setLoading(false);
//           initialCheckDone.current = true;
//         }
//       })
//       .catch((error) => {
//         clearTimeout(sessionTimeout); // Clear timeout on error
//         const timeElapsed = ((performance.now() - startTime) / 1000).toFixed(2);
//         console.error(`🚀 UnifiedAuth v60.0 - Error getting session after ${timeElapsed}s:`, error);
//         setCurrentUser(null);
//         setSession(null);
//         setIsSessionReady(false);
//         setLoading(false);
//         initialCheckDone.current = true;
//         toast.error("Error initializing authentication. Please refresh the page.");
//       });

//     return () => {
//       console.log("🚀 UnifiedAuth v60.0 - Cleaning up auth listener");
//       subscription.unsubscribe();
//     };
//   }, []); // Empty deps - let Supabase handle session refresh internally

//   // Fetch users when user becomes admin - ONCE per session
//   useEffect(() => {
//     console.log("UnifiedAuth - useEffect triggered:", {
//       isAdmin,
//       loading,
//       hasCurrentOrganization: !!currentOrganization,
//     });

//     // CRITICAL FIX: Only fetch users ONCE when admin becomes available
//     // Don't refetch on every currentOrganization change
//     if (isAdmin && !loading && currentOrganization && users.length === 0) {
//       console.log("UnifiedAuth - Initial admin fetch, calling fetchUsers");
//       fetchUsers();
//     }
//   }, [isAdmin, loading]); // REMOVED currentOrganization?.id to prevent constant refetches

//   const value: UnifiedAuthContextType = useMemo(
//     () => ({
//       currentUser: enhancedCurrentUser,
//       session, // Include in value but not in deps - prevents cascade re-renders on token refresh
//       // CRITICAL: Override loading to false if we've completed setup once
//       // This prevents loading flashes on tab switches even if state updates occur
//       loading: hasCompletedInitialSetup.current ? false : loading,
//       isInitialized: initialCheckDone.current,
//       isSessionReady, // CRITICAL: Expose session ready flag for query hooks
//       isSigningOut,
//       signOut,
//       currentOrganization,
//       userOrganizations,
//       switchOrganization,
//       refreshOrganizations,
//       getCurrentUserRole,
//       isAdmin,
//       canAccessProperty,
//       users,
//       fetchUsers,
//       addUser,
//       updateUser,
//       removeUser,
//       resetPassword,
//       adminResetPassword,
//     }),
//     [
//       enhancedCurrentUser,
//       // session removed from deps - token refreshes shouldn't trigger context recompute
//       loading,
//       isSessionReady, // Include in deps to trigger updates when ready
//       isSigningOut,
//       signOut,
//       currentOrganization,
//       userOrganizations,
//       switchOrganization,
//       refreshOrganizations,
//       getCurrentUserRole,
//       isAdmin,
//       canAccessProperty,
//       users,
//       fetchUsers,
//       addUser,
//       updateUser,
//       removeUser,
//       resetPassword,
//       adminResetPassword,
//     ],
//   );

//   console.log("🚀 UnifiedAuth v60.0 - Provider render:", {
//     hasCurrentUser: !!enhancedCurrentUser,
//     currentUserEmail: enhancedCurrentUser?.email,
//     currentUserRole: enhancedCurrentUser?.role,
//     effectiveRole: effectiveRole,
//     profileRole: currentUser?.role,
//     loading,
//     hasOrganization: !!currentOrganization,
//     organizationName: currentOrganization?.name,
//     timestamp: new Date().toISOString(),
//   });

//   return (
//     <UnifiedAuthContext.Provider value={value}>
//       {!initialCheckDone.current && !hasCompletedInitialSetup.current ? (
//         <div className="min-h-screen flex items-center justify-center bg-background">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
//         </div>
//       ) : (
//         children
//       )}
//     </UnifiedAuthContext.Provider>
//   );
// };

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { User, UserRole } from "@/types/user";
import { toast } from "@/lib/toast";
import { authDebugMarker } from "@/auth-debug";
import "@/auth-debug"; // Force import to trigger debug logs
import { setSentryUser } from "@/lib/sentry";

console.log("🚀 UnifiedAuth Context loading with debug marker:", authDebugMarker);

// Helper: Wrap any promise with a timeout to prevent indefinite hangs
// Used to protect PATH 2 (getSession fallback) from network hangs after multiple tab revisits
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)),
  ]);
}

// Import the full AddUserResult interface
export interface AddUserResult {
  success: boolean;
  message: string;
  userId?: string;
  emailSent?: boolean;
  emailError?: string;
  testMode?: boolean;
  testModeInfo?: string;
  isNewUser?: boolean;
  isExistingUserAddedToOrg?: boolean;
  email?: string;
}

// Organization types
interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  settings: any;
}

interface UserOrganization {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  organization: Organization;
}

interface UnifiedAuthContextType {
  // Simple auth properties
  currentUser: User | null;
  session: Session | null;
  loading: boolean;
  isInitialized: boolean; // Track if initial auth check is complete
  isSessionReady: boolean; // CRITICAL: Track if Supabase client session is fully propagated and ready for queries
  sessionVersion: number; // v81.0: Incrementing counter to force re-renders on tab switches
  isSigningOut: boolean; // Track sign out process to prevent UI flashing
  signOut: () => Promise<void>;

  // Multi-organization properties
  currentOrganization: Organization | null;
  userOrganizations: UserOrganization[];
  switchOrganization: (organizationId: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
  getCurrentUserRole: () => string;

  // Admin helper
  isAdmin: boolean;
  canAccessProperty: (propertyId: string) => boolean;

  // User management
  users: User[];
  fetchUsers: () => Promise<void>;
  addUser: (email: string, name: string, role: UserRole, assignedProperties?: string[]) => Promise<AddUserResult>;
  updateUser: (user: User) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  resetPassword: (userId: string, email: string) => Promise<{ success: boolean; message: string }>;
  adminResetPassword: (userId: string, email: string) => Promise<{ success: boolean; message: string }>;
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType | undefined>(undefined);

export const useUnifiedAuth = () => {
  const context = useContext(UnifiedAuthContext);
  if (!context) {
    throw new Error("useUnifiedAuth must be used within a UnifiedAuthProvider");
  }
  return context;
};

/**
 * v82.2: Deferred promise helper for session synchronization
 */
interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// v85.0: Idempotent session ready coordinator with refresh version tracking
// v97.4: Removed currentRefreshVersion - use sessionVersion as single source of truth
const sessionReadyCoordinator = {
  latestReadyVersion: 0,
  pendingWaiters: new Map<number, Set<Deferred<boolean>>>(),
};

/**
 * v83.1 FIX: Wait for session to be ready at specific version
 * IDEMPOTENT: Works even if signal arrives before wait starts
 *
 * When targetVersion is undefined, waits for ANY ready session (uses latestReadyVersion)
 * This prevents blocking on specific versions that may get skipped during rapid tab switches
 */
export async function waitForSessionReady(targetVersion?: number, timeout = 10000): Promise<boolean> {
  const start = Date.now();
  // v83.1 FIX: When undefined, use latestReadyVersion (current), not latestReadyVersion + 1 (next)
  const target = targetVersion ?? sessionReadyCoordinator.latestReadyVersion;

  console.log(
    `🔄 v83.1 - waitForSessionReady(target: ${target}, latest: ${sessionReadyCoordinator.latestReadyVersion})`,
  );

  // CRITICAL: Check if already ready BEFORE creating promise
  if (sessionReadyCoordinator.latestReadyVersion >= target) {
    console.log(`✅ v83.1 - Session ALREADY ready at version ${sessionReadyCoordinator.latestReadyVersion}`);
    return true;
  }

  // Not ready yet - create waiter and add to pending set
  const deferred = createDeferred<boolean>();

  if (!sessionReadyCoordinator.pendingWaiters.has(target)) {
    sessionReadyCoordinator.pendingWaiters.set(target, new Set());
  }
  sessionReadyCoordinator.pendingWaiters.get(target)!.add(deferred);

  const waiterCount = sessionReadyCoordinator.pendingWaiters.get(target)!.size;
  console.log(`⏳ v83.1 - Added waiter for version ${target} (${waiterCount} total waiters)`);

  // Race between signal and timeout
  const timeoutId = setTimeout(() => {
    const elapsed = Date.now() - start;
    console.warn(
      `⏱️ v83.1 - Timeout after ${elapsed}ms (target: ${target}, latest: ${sessionReadyCoordinator.latestReadyVersion})`,
    );

    // Clean up this waiter
    const waiters = sessionReadyCoordinator.pendingWaiters.get(target);
    if (waiters) {
      waiters.delete(deferred);
      if (waiters.size === 0) {
        sessionReadyCoordinator.pendingWaiters.delete(target);
      }
    }

    deferred.resolve(false);
  }, timeout);

  try {
    const result = await deferred.promise;
    clearTimeout(timeoutId);
    const elapsed = Date.now() - start;

    if (result) {
      console.log(`✅ v83.1 - Session ready confirmed in ${elapsed}ms`);
    } else {
      console.warn(`❌ v83.1 - Session ready failed after ${elapsed}ms`);
    }

    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("❌ v83.1 - waitForSessionReady error:", error);
    return false;
  }
}

/**
 * v83.1: Signal that session is ready at given version
 * IDEMPOTENT: Resolves ALL pending waiters and updates latestReadyVersion
 */
export function signalSessionReady(version: number) {
  console.log(
    `🔔 v83.1 - signalSessionReady(${version}), previous latest: ${sessionReadyCoordinator.latestReadyVersion}`,
  );

  // Update latest ready version (monotonically increasing)
  if (version > sessionReadyCoordinator.latestReadyVersion) {
    sessionReadyCoordinator.latestReadyVersion = version;
  }

  // Resolve ALL waiters for this version and earlier
  let totalResolved = 0;
  for (const [waitingVersion, waiters] of sessionReadyCoordinator.pendingWaiters.entries()) {
    if (waitingVersion <= version) {
      console.log(`✅ v83.1 - Resolving ${waiters.size} waiters for version ${waitingVersion}`);
      waiters.forEach((deferred) => deferred.resolve(true));
      totalResolved += waiters.size;
      sessionReadyCoordinator.pendingWaiters.delete(waitingVersion);
    }
  }

  if (totalResolved > 0) {
    console.log(`✅ v83.1 - Resolved ${totalResolved} total waiters`);
  } else {
    console.log(`ℹ️ v83.1 - No pending waiters to resolve (signal arrived first)`);
  }
}

/**
 * v97.4 CRITICAL FIX: Log session refresh start
 *
 * BREAKTHROUGH: We NO LONGER cancel pending waiters!
 * - Previous bug: resolving waiters with false caused infinite retry loops
 * - New approach: Let waiters timeout naturally (10s) if refresh fails
 * - v97.4: Use sessionVersion as single source of truth (no separate counter)
 * - signalSessionReady() will be called in finally blocks GUARANTEED
 *
 * This ensures providers ALWAYS receive a signal, even on errors/timeouts
 */
export function startSessionRefresh(currentSessionVersion: number): void {
  console.log(`🔄 v97.4 - startSessionRefresh() - Current session version: ${currentSessionVersion}`);
  console.log(
    `🔄 v97.4 - Existing waiters (${sessionReadyCoordinator.pendingWaiters.size} versions) will timeout naturally if not resolved`,
  );
}

/**
 * v84.0 FIX: Retry wrapper with exponential backoff
 * Solves the "cancelled waiter" problem where rapid tab switches resolve waiters with false
 *
 * Retries up to maxRetries times with exponential backoff when waitForSessionReady returns false
 * This makes providers resilient to session refresh interruptions
 */
export async function waitForSessionReadyWithRetry(
  targetVersion: number,
  maxRetries: number = 3,
  baseDelay: number = 500,
  timeout: number = 10000,
): Promise<boolean> {
  console.log(`🔁 v84.0 - waitForSessionReadyWithRetry(target: ${targetVersion}, maxRetries: ${maxRetries})`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🔁 v84.0 - Retry attempt ${attempt}/${maxRetries} for version ${targetVersion}`);

    const isReady = await waitForSessionReady(targetVersion, timeout);

    if (isReady) {
      console.log(`✅ v84.0 - Session ready confirmed on attempt ${attempt}`);
      return true;
    }

    // If this isn't the last attempt, wait with exponential backoff before retrying
    if (attempt < maxRetries) {
      const delay = baseDelay * Math.pow(2, attempt - 1); // 500ms, 1000ms, 2000ms
      console.log(`⏳ v84.0 - Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    } else {
      console.warn(`❌ v84.0 - All ${maxRetries} retry attempts exhausted for version ${targetVersion}`);
    }
  }

  return false;
}

// Compatibility hooks for existing components
export const useSimpleAuth = () => {
  const context = useUnifiedAuth();
  return {
    currentUser: context.currentUser,
    session: context.session,
    loading: context.loading,
    isInitialized: context.isInitialized,
    isSessionReady: context.isSessionReady,
    isSigningOut: context.isSigningOut,
    signOut: context.signOut,
    isAdmin: context.isAdmin,
    switchOrganization: context.switchOrganization,
    refreshUser: context.refreshOrganizations, // Map to available method
    currentOrganization: context.currentOrganization,
  };
};

export const useMultiOrganizationContext = () => {
  const context = useUnifiedAuth();
  return {
    currentOrganization: context.currentOrganization,
    userOrganizations: context.userOrganizations,
    loading: context.loading,
    error: null, // For compatibility
    switchOrganization: context.switchOrganization,
    refreshOrganizations: context.refreshOrganizations,
    getCurrentUserRole: context.getCurrentUserRole,
    currentUser: context.currentUser,
  };
};

export const useUserContext = () => {
  const context = useUnifiedAuth();
  return {
    currentUser: context.currentUser,
    users: context.users,
    loading: context.loading,
    loadingError: null,
    fetchUsers: context.fetchUsers,
    addUser: context.addUser,
    updateUser: context.updateUser,
    removeUser: context.removeUser,
    resetPassword: context.resetPassword,
    adminResetPassword: context.adminResetPassword,
    isAdmin: context.isAdmin,
    canAccessProperty: context.canAccessProperty,
    signOut: context.signOut,
  };
};

// v97.3: Session-version-scoped deduplication to prevent concurrent conversions
// within same session refresh while allowing fresh fetches across tab revisits
const conversionCache = new Map<string, { promise: Promise<User>; sessionVersion: number }>();

// Simple user conversion with session-version-scoped deduplication
const convertSupabaseUser = async (supabaseUser: SupabaseUser, currentSessionVersion: number): Promise<User> => {
  const cacheKey = supabaseUser.id;
  const cached = conversionCache.get(cacheKey);

  // v97.3: Only dedupe if conversion is in-flight for the SAME session version
  if (cached && cached.sessionVersion === currentSessionVersion) {
    console.log("🔄 v97.3 - Deduplicating concurrent conversion for same sessionVersion:", currentSessionVersion);
    return cached.promise;
  }

  console.log("🔄 v97.3 - Starting new profile fetch (sessionVersion:", currentSessionVersion, ")");

  const promise = (async () => {
    try {
      console.log(
        "🔄 v97.3 - UnifiedAuth: convertSupabaseUser called for:",
        supabaseUser.email,
        "sessionVersion:",
        currentSessionVersion,
      );

      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", supabaseUser.id)
          .maybeSingle();

        if (profileError) {
          console.warn("🔄 v79.2 - Profile query error:", profileError.message);
        }

        console.log("🔄 v79.2 - Profile query completed:", {
          hasProfile: !!profile,
          hasOrganization: !!profile?.organization_id,
          error: profileError?.message,
        });

        // Create user object with fallbacks - always succeed
        const user: User = {
          id: supabaseUser.id,
          email: supabaseUser.email || "",
          name: profile?.name || supabaseUser.user_metadata?.name || supabaseUser.email?.split("@")[0] || "User",
          role: (profile?.role as UserRole) || "manager",
          assignedProperties: profile?.assigned_properties || [],
          createdAt: profile?.created_at || supabaseUser.created_at,
          organization_id: profile?.organization_id || null,
          session_organization_id: profile?.session_organization_id || null,
        };

        console.log("🔄 UnifiedAuth v50.0 - User converted successfully:", {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organization_id: user.organization_id,
          session_organization_id: user.session_organization_id,
          needsOnboarding: !user.organization_id,
        });

        return user;
      } catch (queryError: any) {
        if (queryError.name === "AbortError") {
          console.warn("🔄 v79.2 - Profile query timed out, using fallback");
        } else {
          console.error("🔄 v79.2 - Profile query failed:", queryError);
        }

        // Return basic user on timeout/error
        return {
          id: supabaseUser.id,
          email: supabaseUser.email || "",
          name: supabaseUser.email?.split("@")[0] || "User",
          role: "manager" as UserRole,
          assignedProperties: [],
          createdAt: supabaseUser.created_at,
          organization_id: null,
          session_organization_id: null,
        };
      }
    } catch (error) {
      console.error("🔄 UnifiedAuth v50.0 - Error converting user:", error);
      // Return basic user on error
      const fallbackUser = {
        id: supabaseUser.id,
        email: supabaseUser.email || "",
        name: supabaseUser.email?.split("@")[0] || "User",
        role: "manager" as UserRole,
        assignedProperties: [],
        createdAt: supabaseUser.created_at,
        organization_id: null,
        session_organization_id: null,
      };

      console.log("🔄 UnifiedAuth v50.0 - Returning fallback user:", fallbackUser);
      return fallbackUser;
    } finally {
      // v97.3: Clear cache entry after conversion completes
      conversionCache.delete(cacheKey);
    }
  })();

  // v97.3: Store promise with sessionVersion for deduplication
  conversionCache.set(cacheKey, { promise, sessionVersion: currentSessionVersion });

  return promise;
};

export const UnifiedAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSessionReady, setIsSessionReady] = useState(false); // CRITICAL: Track if Supabase client session is ready
  const [sessionVersion, setSessionVersion] = useState(0); // v81.0: Increment on each session restore to force re-renders
  const initialCheckDone = useRef(false); // CRITICAL: Use ref to prevent reset on remount
  const [isSigningOut, setIsSigningOut] = useState(false);
  const hasCompletedInitialSetup = useRef(false);
  const authenticatedUserIdRef = useRef<string | null>(null); // v79.4: Track authenticated user ID to prevent redundant conversions

  // v79.0: REMOVED - No error handler needed, React Query handles all errors

  // Organization state
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<UserOrganization[]>([]);

  // User management state
  const [users, setUsers] = useState<User[]>([]);

  // v51.0: Deduplication tracking
  const deduplicationRef = useRef({ isConverting: false, promise: null as Promise<User> | null });

  // CRITICAL: Create refs to hold current session/user for visibility coordinator
  // These refs are updated whenever session/user changes to prevent stale closures
  const sessionRef = useRef<Session | null>(null);
  const currentUserRef = useRef<User | null>(null);

  const signOut = useCallback(async () => {
    try {
      console.log("🔐 UnifiedAuth - Starting sign out process");

      // Set signing out flag FIRST to prevent UI flashing during cleanup
      setIsSigningOut(true);

      // Clear Sentry user context immediately
      setSentryUser(null);

      // Import auth cleanup utilities
      const { performRobustSignOut } = await import("@/utils/authCleanup");

      // Perform robust sign out with timeout
      const signOutPromise = performRobustSignOut(supabase);
      const timeoutPromise = new Promise(
        (resolve) =>
          setTimeout(() => {
            console.warn("🔐 UnifiedAuth - Sign out timeout, forcing cleanup");
            resolve(true);
          }, 5000), // 5 second timeout
      );

      await Promise.race([signOutPromise, timeoutPromise]);

      // Clear local state immediately
      setCurrentUser(null);
      setSession(null);
      setIsSessionReady(false); // Clear session ready flag
      setUserOrganizations([]);
      setCurrentOrganization(null);

      console.log("🔐 UnifiedAuth - Sign out completed successfully");
      toast.success("Signed out successfully");
    } catch (error) {
      console.error("🔐 UnifiedAuth - Error signing out:", error);

      // Even on error, clear local state
      setCurrentUser(null);
      setSession(null);
      setUserOrganizations([]);
      setCurrentOrganization(null);

      toast.error("Error signing out");
    }
  }, []);

  const fetchUserOrganizations = async (user: User) => {
    if (!user?.id) {
      console.log("UnifiedAuth - No user ID, clearing organizations");
      setUserOrganizations([]);
      setCurrentOrganization(null);
      return null;
    }

    try {
      console.log("UnifiedAuth - Fetching organizations for user:", user.id);

      try {
        // Fetch user organizations
        const { data: userOrgs, error: userOrgsError } = await supabase
          .from("user_organizations")
          .select(
            `
            *,
            organization_id,
            role,
            is_active,
            is_default
          `,
          )
          .eq("user_id", user.id)
          .eq("is_active", true);

        if (userOrgsError) {
          console.warn("UnifiedAuth - Error fetching user organizations:", userOrgsError);
          throw userOrgsError;
        }

        if (!userOrgs || userOrgs.length === 0) {
          console.log("UnifiedAuth - No organizations found, using profile organization_id");
          setUserOrganizations([]);
          setCurrentOrganization(null);
          return user.organization_id || null;
        }

        // Fetch organization details
        const orgIds = userOrgs.map((uo: any) => uo.organization_id);

        const { data: organizations, error: orgsError } = await supabase
          .from("organizations")
          .select("*")
          .in("id", orgIds);

        if (orgsError) {
          console.warn("UnifiedAuth - Error fetching organizations:", orgsError);
          throw orgsError;
        }

        const mappedUserOrganizations = userOrgs
          .map((uo: any) => {
            const organization = organizations?.find((org) => org.id === uo.organization_id);
            return {
              ...uo,
              organization: organization as Organization,
            };
          })
          .filter((uo: any) => uo.organization);

        setUserOrganizations(mappedUserOrganizations);

        // Set current organization (prefer session, then default, then first)
        if (mappedUserOrganizations.length > 0) {
          let targetOrg: Organization | null = null;

          // Try session organization first
          if (user.session_organization_id) {
            const sessionOrg = mappedUserOrganizations.find(
              (uo: any) => uo.organization_id === user.session_organization_id,
            );
            if (sessionOrg) {
              targetOrg = sessionOrg.organization;
            }
          }

          // Fallback to default organization
          if (!targetOrg) {
            const defaultOrg = mappedUserOrganizations.find((uo: any) => uo.is_default);
            if (defaultOrg) {
              targetOrg = defaultOrg.organization;
            }
          }

          // Final fallback to first organization
          if (!targetOrg) {
            targetOrg = mappedUserOrganizations[0].organization;
          }

          setCurrentOrganization(targetOrg);
          console.log("UnifiedAuth - Set current organization:", targetOrg?.name);
          return targetOrg?.id || null;
        }

        return user.organization_id || null;
      } catch (fetchError) {
        throw fetchError;
      }
    } catch (error) {
      console.error("UnifiedAuth - Error in fetchUserOrganizations:", error);
      // Only clear if it's not a timeout - preserve existing data on timeout
      if (!(error instanceof Error && error.message === "Organization fetch timeout")) {
        setUserOrganizations([]);
        setCurrentOrganization(null);
      }
      return user.organization_id || null;
    }
  };

  const switchOrganization = useCallback(
    async (organizationId: string) => {
      try {
        const targetOrgData = userOrganizations.find((uo) => uo.organization_id === organizationId);

        if (!targetOrgData) {
          throw new Error("Organization not found");
        }

        // Call the database function to switch organization
        const { error } = await supabase.rpc("switch_user_organization", {
          new_org_id: organizationId,
        });

        if (error) {
          throw new Error(`Failed to switch organization: ${error.message}`);
        }

        setCurrentOrganization(targetOrgData.organization);
        toast.success(`Switched to ${targetOrgData.organization.name}`);
      } catch (error) {
        console.error("Error switching organization:", error);
        toast.error("Failed to switch organization");
      }
    },
    [userOrganizations],
  );

  const refreshOrganizations = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      console.log("🔄 Refreshing user data and organizations...");

      // Refetch user profile to get updated role
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      // Convert to User type with fresh data
      // v97.3: Pass sessionVersion 0 for manual refreshes (not tied to auth state change)
      const freshUser = await convertSupabaseUser(authUser, sessionVersion);
      if (freshUser) {
        setCurrentUser(freshUser);
        // Fetch organizations with the fresh user data
        await fetchUserOrganizations(freshUser);
      }

      console.log("✅ User data and organizations refreshed");
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  }, [currentUser?.id]);

  const getCurrentUserRole = useCallback((): string => {
    if (!currentOrganization || !currentUser?.id) {
      return currentUser?.role || "manager";
    }

    const userOrg = userOrganizations.find((uo) => uo.organization_id === currentOrganization.id);

    return userOrg?.role || currentUser?.role || "manager";
  }, [currentOrganization?.id, currentUser?.id, currentUser?.role, userOrganizations]);

  // Use organization role when available, fallback to profile role
  // CRITICAL: Memoize effectiveRole to prevent infinite re-renders
  const effectiveRole = useMemo(() => {
    if (!currentUser) return "manager";

    // If user has organizations, use the organization role
    if (currentOrganization && userOrganizations.length > 0) {
      const userOrg = userOrganizations.find((uo) => uo.organization_id === currentOrganization.id);
      if (userOrg) {
        return userOrg.role;
      }
    }

    // Fallback to profile role
    return currentUser.role || "manager";
  }, [currentUser?.id, currentUser?.role, currentOrganization?.id, userOrganizations]);

  const isAdmin = useMemo(() => effectiveRole === "admin", [effectiveRole]);

  const canAccessProperty = useCallback(
    (propertyId: string): boolean => {
      if (!currentUser) return false;
      if (effectiveRole === "admin") return true;
      return currentUser.assignedProperties?.includes(propertyId) || false;
    },
    [currentUser?.id, currentUser?.assignedProperties, effectiveRole],
  );

  // Create enhanced currentUser with effective role
  // CRITICAL: Only create new object if actual values changed
  const enhancedCurrentUser = useMemo(() => {
    if (!currentUser) return null;

    // If role matches, return the same object to prevent unnecessary re-renders
    if (currentUser.role === effectiveRole) {
      return currentUser;
    }

    // Only create new object if role actually changed
    return {
      ...currentUser,
      role: effectiveRole as UserRole,
    };
  }, [currentUser, effectiveRole]); // Simplified deps - only recompute if currentUser or role changes

  // User management functions
  const fetchUsers = useCallback(async () => {
    console.log(
      "UnifiedAuth - fetchUsers called, effectiveRole:",
      effectiveRole,
      "currentOrganization:",
      !!currentOrganization,
    );

    const isAdminRole = effectiveRole === "admin";

    if (!isAdminRole) {
      console.log("UnifiedAuth - Not fetching users (not admin)");
      return;
    }

    try {
      console.log("UnifiedAuth - Fetching users for practice leader dropdown");
      const { fetchAllUsers } = await import("@/services/user/userQueries");

      try {
        const userData = await fetchAllUsers();

        console.log("UnifiedAuth - Raw user data received:", userData.length, "users");

        // Convert to User type format
        const convertedUsers = userData.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          assignedProperties: user.assignedProperties || [],
          createdAt: user.createdAt,
          organization_id: user.organization_id,
        }));

        console.log("UnifiedAuth - Converted users:", convertedUsers);
        setUsers(convertedUsers);
        console.log("UnifiedAuth - Users set for practice leaders:", convertedUsers.length);
      } catch (fetchError) {
        throw fetchError;
      }
    } catch (error) {
      console.error("UnifiedAuth - Error fetching users:", error);
      if (error instanceof Error && (error.message.includes("aborted") || error.message.includes("timeout"))) {
        console.warn("⏱️ User fetch aborted due to timeout");
      }
    }
  }, [effectiveRole]);

  const addUser = useCallback(
    async (email: string, name: string, role: UserRole, assignedProperties?: string[]): Promise<AddUserResult> => {
      // Basic implementation - would be replaced with actual service call
      console.log("addUser called:", { email, name, role, assignedProperties });
      return {
        success: false,
        message: "User management not fully implemented yet",
        email,
      };
    },
    [],
  );

  const updateUser = useCallback(async (user: User) => {
    console.log("updateUser called:", user);
  }, []);

  const removeUser = useCallback(async (userId: string) => {
    console.log("removeUser called:", userId);
  }, []);

  const resetPassword = useCallback(async (userId: string, email: string) => {
    console.log("resetPassword called:", { userId, email });
    try {
      // Use production URL if on production, otherwise use current origin
      const isProduction =
        window.location.hostname === "housinghub.app" || window.location.hostname === "www.housinghub.app";
      const redirectUrl = isProduction
        ? `https://housinghub.app/setup-password?email=${encodeURIComponent(email)}`
        : `${window.location.origin}/setup-password?email=${encodeURIComponent(email)}`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error("Error requesting password reset:", error);
        return {
          success: false,
          message: error.message || "Password reset failed",
        };
      }

      return {
        success: true,
        message: `Password reset email sent to ${email}`,
      };
    } catch (error: any) {
      console.error("Error in resetPassword:", error);
      return {
        success: false,
        message: error.message || "Unknown error occurred",
      };
    }
  }, []);

  const adminResetPassword = useCallback(async (userId: string, email: string) => {
    console.log("adminResetPassword called:", { userId, email });
    try {
      // Use production URL if on production, otherwise use current origin
      const isProduction =
        window.location.hostname === "housinghub.app" || window.location.hostname === "www.housinghub.app";
      const redirectUrl = isProduction
        ? `https://housinghub.app/setup-password?email=${encodeURIComponent(email)}`
        : `${window.location.origin}/setup-password?email=${encodeURIComponent(email)}`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error("Error requesting admin password reset:", error);
        return {
          success: false,
          message: error.message || "Password reset failed",
        };
      }

      return {
        success: true,
        message: `Password reset email sent to ${email}`,
      };
    } catch (error: any) {
      console.error("Error in adminResetPassword:", error);
      return {
        success: false,
        message: error.message || "Unknown error occurred",
      };
    }
  }, []);

  // CRITICAL: Update refs whenever session or currentUser changes
  useEffect(() => {
    sessionRef.current = session;
    currentUserRef.current = currentUser;
  }, [session, currentUser]);

  // Helper: Wrap async operations with timeout protection
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
      }),
    ]);
  };

  // v96.1: In-flight protection to prevent concurrent refreshSession() calls
  const isRefreshInFlight = useRef<boolean>(false);
  const refreshInFlightRef = useRef<Promise<boolean> | null>(null);

  // v96.1: Session freshness thresholds
  const REFRESH_TIMEOUT_MS = 5000; // 5 seconds (reduced from 30s to prevent overlapping calls)
  const SESSION_REFRESH_THRESHOLD_SECONDS = 5 * 60; // 5 minutes - only refresh if expiring within this window

  // v96.1: Session restoration with freshness check to avoid unnecessary refreshSession() calls
  // CRITICAL: Only calls refreshSession() when token is actually expiring, preventing SDK corruption
  // CRITICAL FIX v96.1: Don't call refreshSession() if no session exists in localStorage
  useEffect(() => {
    const refreshAuth = async (): Promise<boolean> => {
      // v96.1 CRITICAL: Check if refresh is already in progress
      if (isRefreshInFlight.current && refreshInFlightRef.current) {
        console.log("⏸️ v96.1 - Refresh already in progress, returning existing promise");
        return refreshInFlightRef.current;
      }

      console.log("%c════════════════════════════════════════════════════════", "color: blue; font-weight: bold");
      console.log(
        "%c🔄 UnifiedAuth v97.4 - SESSION CHECK (skip refresh if no session)",
        "color: blue; font-weight: bold",
      );
      console.log("%c════════════════════════════════════════════════════════", "color: blue; font-weight: bold");

      startSessionRefresh(sessionVersion);
      console.log(`🔢 v97.4 - Started refresh cycle for session version ${sessionVersion}`);

      // v96.0: Mark refresh as in-flight and create promise
      isRefreshInFlight.current = true;
      const refreshPromise = (async () => {
        let sessionRestored = false;

        try {
          // v96.0 STEP 1: First check current session state with getSession() (fast localStorage read)
          console.log("📍 v96.0 - Step 1: Checking current session state with getSession()...");

          const {
            data: { session: currentSession },
            error: getSessionError,
          } = await withTimeout(
            supabase.auth.getSession(),
            2000, // Quick 2s timeout for localStorage read
            "getSession() timed out after 2s",
          ).catch((timeoutError) => {
            console.error("❌ v96.0 - getSession TIMEOUT:", timeoutError.message);
            return { data: { session: null }, error: timeoutError };
          });

          if (getSessionError) {
            console.error("❌ v96.0 - getSession ERROR:", getSessionError.message);
            // If we can't even read localStorage, session is invalid
            setIsSessionReady(false);
            return false;
          }

          // v96.1 STEP 2: Check if session exists and calculate freshness
          if (currentSession?.access_token && currentSession.expires_at) {
            const expiresAt = currentSession.expires_at; // Unix timestamp in seconds
            const now = Math.floor(Date.now() / 1000); // Current time in seconds
            const secondsUntilExpiration = expiresAt - now;

            console.log(`📊 v96.1 - Session freshness check:`, {
              expiresAt: new Date(expiresAt * 1000).toISOString(),
              now: new Date(now * 1000).toISOString(),
              secondsUntilExpiration,
              threshold: SESSION_REFRESH_THRESHOLD_SECONDS,
              needsRefresh: secondsUntilExpiration <= SESSION_REFRESH_THRESHOLD_SECONDS,
            });

            // v96.1 STEP 3: Decide whether to refresh based on expiration time
            if (secondsUntilExpiration > SESSION_REFRESH_THRESHOLD_SECONDS) {
              // Session is still fresh (>5 min remaining) - use existing session, NO refresh needed!
              console.log(`✅ v96.1 - Session is FRESH (${Math.floor(secondsUntilExpiration / 60)} minutes remaining)`);
              console.log("✅ v96.1 - Skipping refreshSession() - using existing valid session");
              console.log("✅ v96.1 - User:", currentSession.user?.email);

              setIsSessionReady(true);
              sessionRestored = true;
              setSessionVersion((v) => {
                const next = v + 1;
                console.log(`🔢 v97.4 - SessionVersion: ${v} → ${next} (reused fresh session)`);
                return next;
              });
              console.log(
                "%c════════════════════════════════════════════════════════",
                "color: lime; font-weight: bold",
              );
              console.log("%c✅ v96.1 - SESSION REUSED (no refresh needed)", "color: lime; font-weight: bold");
              console.log(
                "%c════════════════════════════════════════════════════════",
                "color: lime; font-weight: bold",
              );
              return true;
            }

            // Session is expiring soon or expired - need to refresh
            console.log(
              `⚠️ v96.1 - Session EXPIRING SOON (${Math.floor(secondsUntilExpiration / 60)} minutes remaining)`,
            );
            console.log("📍 v96.1 - Calling refreshSession() to renew token...");
          } else {
            // v96.1 CRITICAL FIX: No session in localStorage - don't call refreshSession() at all!
            // This prevents "Auth session missing!" errors and redirect loops on login page
            console.log("⚠️ v96.1 - No valid session found in localStorage");
            console.log("✅ v96.1 - Skipping refreshSession() - user not logged in");
            console.log(
              "%c════════════════════════════════════════════════════════",
              "color: yellow; font-weight: bold",
            );
            console.log(
              "%c⚠️ v96.1 - NO SESSION (user not logged in, no refresh needed)",
              "color: yellow; font-weight: bold",
            );
            console.log(
              "%c════════════════════════════════════════════════════════",
              "color: yellow; font-weight: bold",
            );
            setIsSessionReady(false);
            return false;
          }

          // v96.0 STEP 4: Call refreshSession() only when needed
          const {
            data: { session },
            error,
          } = await withTimeout(
            supabase.auth.refreshSession(),
            REFRESH_TIMEOUT_MS, // v96.0: 5 second timeout
            "refreshSession() timed out after 5s",
          ).catch((timeoutError) => {
            console.error("❌ v96.0 - refreshSession TIMEOUT:", timeoutError.message);
            return { data: { session: null }, error: timeoutError };
          });

          if (error) {
            const errorMessage = error.message || String(error);
            console.error("❌ v96.0 - refreshSession ERROR:", errorMessage);

            // v96.0: Intelligent error differentiation
            const isNetworkError =
              errorMessage.includes("timeout") || errorMessage.includes("network") || errorMessage.includes("fetch");

            const isSessionMissing =
              errorMessage.includes("session missing") ||
              errorMessage.includes("Auth session missing") ||
              errorMessage.includes("No session");

            // v96.0: Fallback to getSession() if refreshSession() fails with "session missing"
            // This should rarely happen now since we check freshness first
            if (isSessionMissing) {
              console.warn("⚠️ v96.0 - Session missing error (rare), falling back to getSession()...");

              try {
                const {
                  data: { session: fallbackSession },
                } = await withTimeout(
                  supabase.auth.getSession(),
                  2000, // Quick 2s timeout for localStorage read
                  "getSession() fallback timed out",
                );

                if (fallbackSession?.access_token) {
                  console.log("✅ v96.0 - Fallback getSession() succeeded:", fallbackSession.user?.email);
                  setIsSessionReady(true);
                  sessionRestored = true;
                  setSessionVersion((v) => {
                    const next = v + 1;
                    console.log(`🔢 v97.4 - SessionVersion: ${v} → ${next} (fallback refresh)`);
                    return next;
                  });
                  return true;
                }
              } catch (fallbackError) {
                console.error("❌ v96.0 - Fallback getSession() also failed:", fallbackError);
              }
            }

            if (isNetworkError) {
              console.warn("⚠️ v96.0 - Network error during refresh - session may still be valid");
              setIsSessionReady(false);
              return false;
            }

            // True auth failure - session is invalid
            console.log("%c════════════════════════════════════════════════════════", "color: red; font-weight: bold");
            console.log("%c❌ v96.0 - SESSION INVALID (auth failure)", "color: red; font-weight: bold");
            console.log("%c════════════════════════════════════════════════════════", "color: red; font-weight: bold");
            setIsSessionReady(false);
            return false;
          }

          if (session?.access_token) {
            console.log("✅ v96.0 - Session refreshed successfully:", session.user?.email);
            console.log("✅ v96.0 - New expiration:", new Date(session.expires_at! * 1000).toISOString());
            setIsSessionReady(true);
            sessionRestored = true;
            setSessionVersion((v) => {
              const next = v + 1;
              console.log(`🔢 v97.4 - SessionVersion: ${v} → ${next} (refresh)`);
              return next;
            });
            console.log("%c════════════════════════════════════════════════════════", "color: lime; font-weight: bold");
            console.log("%c✅ v96.0 - SESSION REFRESHED (token renewed)", "color: lime; font-weight: bold");
            console.log("%c════════════════════════════════════════════════════════", "color: lime; font-weight: bold");
            return true;
          }

          // No session available (user not logged in)
          console.warn("⚠️ v96.0 - No session found (user not authenticated)");
          console.log("%c════════════════════════════════════════════════════════", "color: yellow; font-weight: bold");
          console.log("%c⚠️ v96.0 - NO SESSION (user not logged in)", "color: yellow; font-weight: bold");
          console.log("%c════════════════════════════════════════════════════════", "color: yellow; font-weight: bold");
          setIsSessionReady(false);
          return false;
        } catch (error) {
          console.error("❌ v96.0 - SESSION CHECK CRITICAL ERROR:", error);
          console.log("%c════════════════════════════════════════════════════════", "color: red; font-weight: bold");
          console.log("%c❌ v96.0 - SESSION CHECK FAILED: Exception", "color: red; font-weight: bold");
          console.log("%c════════════════════════════════════════════════════════", "color: red; font-weight: bold");
          setIsSessionReady(false);
          return false;
        } finally {
          // v96.0: Clear in-flight flag
          isRefreshInFlight.current = false;
          refreshInFlightRef.current = null;

          // ALWAYS signal, even on failure (ensures providers get unblocked)
          setSessionVersion((currentVersion) => {
            console.log(
              `🚨 v97.4 FINALLY - Signaling session ready for version ${currentVersion} (restored: ${sessionRestored})`,
            );
            signalSessionReady(currentVersion);
            console.log(`✅ v97.4 - Signal sent for version ${currentVersion}`);
            return currentVersion;
          });
        }
      })();

      // v96.0: Store promise for concurrent calls
      refreshInFlightRef.current = refreshPromise;
      return refreshPromise;
    };

    console.log("🔄 UnifiedAuth v96.2 - Session freshness check enabled (no manual tab visibility refresh)");

    return () => {
      console.log("🔄 UnifiedAuth v96.2 - Cleanup: Clearing in-flight refs");
      isRefreshInFlight.current = false;
      refreshInFlightRef.current = null;
    };
  }, []);

  useEffect(() => {
    console.log(
      "🚀 UnifiedAuth v90.0 - Starting auth initialization with NATIVE Supabase auth at:",
      new Date().toISOString(),
    );
    const startTime = performance.now();
    console.log("🚀 UnifiedAuth v90.0 - Setting up SINGLE auth listener", { authDebugMarker });

    // v90.0: Generation token to prevent stale callbacks
    let currentAuthTicket = 0;
    const getNextAuthTicket = () => ++currentAuthTicket;

    // Set up ONE auth state listener - this is the ONLY place that calls convertSupabaseUser
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🚀 UnifiedAuth v90.0 - Auth state changed:", event, "Session exists:", !!session);

      // v97.4: Start new session refresh cycle for this auth event
      startSessionRefresh(sessionVersion);

      if (event === "SIGNED_IN" && session?.user) {
        console.log("🚀 UnifiedAuth v85.0 - SIGNED_IN event, user email:", session.user.email);

        // 🔥 v79.7: Capture auth ticket at the START of this invocation
        const myAuthTicket = getNextAuthTicket();
        console.log(`🎫 v97.4 - SIGNED_IN handler started with ticket #${myAuthTicket}`);

        // v97.2: REMOVED tab revisit optimization - profiles must be re-fetched on every session refresh
        // This ensures user data (role, organization) stays fresh on tab revisits
        // Deduplication inside convertSupabaseUser() prevents concurrent conversions

        // Set session immediately (non-async)
        setSession(session);
        console.log("🚀 UnifiedAuth v85.0 - Session set, starting user conversion...");

        // CRITICAL FIX: Use setTimeout to defer async Supabase calls to prevent deadlocks
        // This is the official Supabase recommendation to avoid auth callback deadlocks
        setTimeout(async () => {
          try {
            console.log(`🚀 UnifiedAuth v97.4 - Starting deferred user conversion (ticket #${myAuthTicket})...`);
            const user = await convertSupabaseUser(session.user, sessionVersion);
            console.log("🚀 UnifiedAuth v97.3 - User converted:", user.email, "org_id:", user.organization_id);

            // CRITICAL: Set user first so components can start rendering
            setCurrentUser(user);
            // v79.4: Track authenticated user ID in ref to prevent redundant conversions
            authenticatedUserIdRef.current = user.id;
            console.log("🚀 UnifiedAuth v86.0 - User set, marking auth as loaded");

            // v86.0: ALWAYS increment sessionVersion and signal (removed ticket guard)
            setIsSessionReady(true);
            setSessionVersion((v) => {
              const next = v + 1;
              console.log(`🔢 v97.4 - SessionVersion: ${v} → ${next} (ticket #${myAuthTicket}) [NEW USER]`);
              // v86.0 CRITICAL: Always signal to unblock waiting providers
              signalSessionReady(next);
              console.log(`✅ v97.4 - Signaled session ready for version ${next} (new user SIGNED_IN)`);
              return next;
            });

            // Still log ticket status but don't skip signal
            if (myAuthTicket !== currentAuthTicket) {
              console.warn(
                `⚠️ v97.4 - STALE callback ticket #${myAuthTicket} (current: #${currentAuthTicket}) - but still signaled to unblock waiters`,
              );
            }

            // Mark loading as false AFTER session ready (prevents query race condition)
            setLoading(false);

            // Set Sentry user context
            setSentryUser({
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            });

            // Fetch organizations in background WITHOUT blocking UI
            fetchUserOrganizations(user).catch((orgError) => {
              console.warn("🚀 UnifiedAuth v86.0 - Non-critical org fetch error:", orgError);
            });
          } catch (error) {
            console.error(`🚀 UnifiedAuth v86.0 - Error in deferred user conversion (ticket #${myAuthTicket}):`, error);
            setCurrentUser(null);
            setSession(null);

            // v86.0: ALWAYS set ready state and signal (removed ticket guard)
            setIsSessionReady(false);
            setSessionVersion((v) => {
              console.log(`❌ v97.4 - Session error, signaling failure for version ${v} (ticket #${myAuthTicket})`);
              signalSessionReady(v); // Signal with current version to unblock waiters
              return v; // Don't increment on error
            });

            // Still log ticket status but don't skip signal
            if (myAuthTicket !== currentAuthTicket) {
              console.warn(
                `⚠️ v97.4 - STALE error callback ticket #${myAuthTicket} (current: #${currentAuthTicket}) - but still signaled to unblock waiters`,
              );
            }

            setLoading(false);

            // Clear Sentry user context on error
            setSentryUser(null);
          }
        }, 0);
      } else if (event === "SIGNED_OUT") {
        console.log("🚀 UnifiedAuth v60.0 - SIGNED_OUT event");
        setLoading(false);
        setCurrentUser(null);
        setSession(null);
        setIsSessionReady(false); // Clear session ready flag
        setUserOrganizations([]);
        setCurrentOrganization(null);
        setIsSigningOut(false); // Clear signing out flag
        // v79.4: Clear authenticated user ref
        authenticatedUserIdRef.current = null;

        // Clear Sentry user context
        setSentryUser(null);
      } else if (event === "TOKEN_REFRESHED" && session) {
        console.log(
          "🚀 UnifiedAuth v60.0 - TOKEN_REFRESHED event - No action needed, Supabase handles tokens internally",
        );
        // CRITICAL FIX: Do NOT update session state on TOKEN_REFRESHED
        // Supabase client handles token refresh internally and maintains the real session
        // Updating our state snapshot here causes unnecessary re-renders and loading flashes
        // Our session state is just a reference - Supabase keeps it valid automatically
      } else if (event === "USER_UPDATED" && session?.user) {
        console.log("🚀 UnifiedAuth v60.0 - USER_UPDATED event");
        // Use setTimeout for USER_UPDATED as well
        setTimeout(async () => {
          try {
            const user = await convertSupabaseUser(session.user, sessionVersion);
            setCurrentUser(user);
            setSession(session);
            // v79.4: Track authenticated user ID in ref
            authenticatedUserIdRef.current = user.id;

            // Update Sentry user context
            setSentryUser({
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            });

            await fetchUserOrganizations(user);
          } catch (error) {
            console.error("🚀 UnifiedAuth v60.0 - Error converting updated user:", error);
          }
        }, 0);
      } else if (event === "INITIAL_SESSION") {
        // 🔥 v79.7: Get auth ticket for INITIAL_SESSION
        const myAuthTicket = getNextAuthTicket();
        console.log(`🎫 v97.4 - INITIAL_SESSION handler started with ticket #${myAuthTicket}`);

        // CRITICAL FIX: Process session if it exists (e.g., from App.tsx rehydration)
        console.log("🚀 UnifiedAuth v86.0 - INITIAL_SESSION event, session exists:", !!session);

        if (session?.user) {
          console.log("🚀 UnifiedAuth v86.0 - INITIAL_SESSION has session, processing user...");
          setSession(session);

          setTimeout(async () => {
            try {
              const user = await convertSupabaseUser(session.user, sessionVersion);
              setCurrentUser(user);
              // v79.4: Track authenticated user ID in ref
              authenticatedUserIdRef.current = user.id;

              // v86.0: ALWAYS signal (removed ticket guard)
              setIsSessionReady(true);
              setSessionVersion((v) => {
                const next = v + 1;
                console.log(`🔢 v97.4 - SessionVersion: ${v} → ${next} (ticket #${myAuthTicket}) [INITIAL_SESSION]`);
                // v86.0 CRITICAL: Always signal to unblock waiting providers
                signalSessionReady(next);
                console.log(`✅ v97.4 - Signaled session ready for version ${next} (INITIAL_SESSION)`);
                return next;
              });

              // Still log ticket status but don't skip signal
              if (myAuthTicket !== currentAuthTicket) {
                console.warn(
                  `⚠️ v97.4 - STALE INITIAL_SESSION ticket #${myAuthTicket} (current: #${currentAuthTicket}) - but still signaled to unblock waiters`,
                );
              }

              setLoading(false);
              initialCheckDone.current = true;
              hasCompletedInitialSetup.current = true;

              fetchUserOrganizations(user).catch(console.warn);
            } catch (error) {
              console.error(
                `❌ UnifiedAuth v86.0 - Error processing INITIAL_SESSION (ticket #${myAuthTicket}):`,
                error,
              );
              setCurrentUser(null);
              setSession(null);

              // v86.0: ALWAYS signal (removed ticket guard)
              setIsSessionReady(false);
              setSessionVersion((v) => {
                console.log(
                  `❌ v97.4 - INITIAL_SESSION error, signaling failure for version ${v} (ticket #${myAuthTicket})`,
                );
                signalSessionReady(v); // Signal with current version to unblock waiters
                return v; // Don't increment on error
              });

              // Still log ticket status but don't skip signal
              if (myAuthTicket !== currentAuthTicket) {
                console.warn(
                  `⚠️ v97.4 - STALE INITIAL_SESSION error ticket #${myAuthTicket} (current: #${currentAuthTicket}) - but still signaled to unblock waiters`,
                );
              }

              setLoading(false);
            }
          }, 0);
        } else {
          // No session yet - wait for getSession()
          console.log("🚀 UnifiedAuth v86.0 - INITIAL_SESSION without session, waiting for getSession()");
        }
      } else {
        console.log("🚀 UnifiedAuth v60.0 - Other auth event:", event);
        setLoading(false);
      }
    });

    // 🔥 v79.7: Get auth ticket for initial getSession() call
    const initialSessionTicket = getNextAuthTicket();
    console.log(`🎫 v79.7 - Initial getSession() will use ticket #${initialSessionTicket}`);

    // THEN get initial session with timeout protection
    const sessionTimeout = setTimeout(() => {
      const timeElapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      console.error(`🚀 UnifiedAuth v60.0 - getSession() timeout after ${timeElapsed}s! Forcing loading to false`);
      setLoading(false);
      initialCheckDone.current = true;
      toast.error("Authentication initialization timed out. Please refresh the page.");
    }, 8000); // 8 second max for getSession

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        clearTimeout(sessionTimeout); // Clear timeout if successful
        const timeElapsed = ((performance.now() - startTime) / 1000).toFixed(2);
        console.log(
          `🚀 UnifiedAuth v85.0 - Initial session check completed in ${timeElapsed}s:`,
          session ? "Found session for " + session.user?.email : "No session",
        );

        if (session?.user) {
          // Set session immediately (non-async)
          setSession(session);
          console.log("🚀 UnifiedAuth v85.0 - Initial session set, starting user data load");

          // Use setTimeout to defer async calls for initial session too
          setTimeout(async () => {
            try {
              console.log(
                `🚀 UnifiedAuth v97.3 - Processing initial session for: ${session.user.email} (ticket #${initialSessionTicket})`,
              );
              // v97.3: Pass 1 for initial session version (first session)
              const user = await convertSupabaseUser(session.user, 1);
              console.log(
                "🚀 UnifiedAuth v86.0 - Initial user converted:",
                user.email,
                "org_id:",
                user.organization_id,
              );

              // CRITICAL: Set user and session ready FIRST
              setCurrentUser(user);

              // v86.0: ALWAYS signal (removed ticket guard)
              setIsSessionReady(true);
              setSessionVersion((v) => {
                const next = v + 1;
                console.log(
                  `🔢 v86.0 - SessionVersion: ${v} → ${next} (ticket #${initialSessionTicket}) [INITIAL getSession]`,
                );
                // v86.0 CRITICAL: Always signal to unblock waiting providers
                signalSessionReady(next);
                console.log(`✅ v86.0 - Signaled session ready for version ${next} (initial getSession)`);
                return next;
              });

              // Still log ticket status but don't skip signal
              if (initialSessionTicket !== currentAuthTicket) {
                console.warn(
                  `⚠️ v86.0 - STALE initial getSession() ticket #${initialSessionTicket} (current: #${currentAuthTicket}) - but still signaled to unblock waiters`,
                );
              }

              // Mark as complete AFTER session ready
              setLoading(false);
              initialCheckDone.current = true;
              hasCompletedInitialSetup.current = true; // Mark that we've successfully initialized
              console.log("🚀 UnifiedAuth v86.0 - Initial auth complete");

              // Fetch organizations in background WITHOUT blocking UI
              fetchUserOrganizations(user).catch((orgError) => {
                console.error("🚀 UnifiedAuth v86.0 - Non-critical org error on initial load:", orgError);
              });
            } catch (error) {
              console.error(
                `🚀 UnifiedAuth v86.0 - Error converting initial user (ticket #${initialSessionTicket}):`,
                error,
              );
              setCurrentUser(null);
              setSession(null);

              // v86.0: ALWAYS signal (removed ticket guard)
              setIsSessionReady(false);
              setSessionVersion((v) => {
                console.log(
                  `❌ v86.0 - Initial getSession error, signaling failure for version ${v} (ticket #${initialSessionTicket})`,
                );
                signalSessionReady(v); // Signal with current version to unblock waiters
                return v; // Don't increment on error
              });

              // Still log ticket status but don't skip signal
              if (initialSessionTicket !== currentAuthTicket) {
                console.warn(
                  `⚠️ v86.0 - STALE initial getSession() error ticket #${initialSessionTicket} (current: #${currentAuthTicket}) - but still signaled to unblock waiters`,
                );
              }

              setLoading(false);
              initialCheckDone.current = true;
            }
          }, 0);
        } else {
          // No session - App.tsx will handle HttpOnly rehydration
          console.log("🚀 UnifiedAuth v60.0 - No session in client, App.tsx will handle cookie rehydration");
          setLoading(false);
          initialCheckDone.current = true;
        }
      })
      .catch((error) => {
        clearTimeout(sessionTimeout); // Clear timeout on error
        const timeElapsed = ((performance.now() - startTime) / 1000).toFixed(2);
        console.error(`🚀 UnifiedAuth v60.0 - Error getting session after ${timeElapsed}s:`, error);
        setCurrentUser(null);
        setSession(null);
        setIsSessionReady(false);
        setLoading(false);
        initialCheckDone.current = true;
        toast.error("Error initializing authentication. Please refresh the page.");
      });

    return () => {
      console.log("🚀 UnifiedAuth v60.0 - Cleaning up auth listener");
      subscription.unsubscribe();
    };
  }, []); // Empty deps - let Supabase handle session refresh internally

  // Fetch users when user becomes admin - ONCE per session
  useEffect(() => {
    console.log("UnifiedAuth - useEffect triggered:", {
      isAdmin,
      loading,
      hasCurrentOrganization: !!currentOrganization,
    });

    // CRITICAL FIX: Only fetch users ONCE when admin becomes available
    // Don't refetch on every currentOrganization change
    if (isAdmin && !loading && currentOrganization && users.length === 0) {
      console.log("UnifiedAuth - Initial admin fetch, calling fetchUsers");
      fetchUsers();
    }
  }, [isAdmin, loading]); // REMOVED currentOrganization?.id to prevent constant refetches

  const value: UnifiedAuthContextType = useMemo(
    () => ({
      currentUser: enhancedCurrentUser,
      session, // Include in value but not in deps - prevents cascade re-renders on token refresh
      // CRITICAL: Override loading to false if we've completed setup once
      // This prevents loading flashes on tab switches even if state updates occur
      loading: hasCompletedInitialSetup.current ? false : loading,
      isInitialized: initialCheckDone.current,
      isSessionReady, // CRITICAL: Expose session ready flag for query hooks
      sessionVersion, // v81.0: Incrementing counter to force re-renders on tab switches
      isSigningOut,
      signOut,
      currentOrganization,
      userOrganizations,
      switchOrganization,
      refreshOrganizations,
      getCurrentUserRole,
      isAdmin,
      canAccessProperty,
      users,
      fetchUsers,
      addUser,
      updateUser,
      removeUser,
      resetPassword,
      adminResetPassword,
    }),
    [
      enhancedCurrentUser,
      // session removed from deps - token refreshes shouldn't trigger context recompute
      loading,
      isSessionReady, // Include in deps to trigger updates when ready
      sessionVersion, // v81.0: CRITICAL - Include to force new context object on tab switches
      isSigningOut,
      signOut,
      currentOrganization,
      userOrganizations,
      switchOrganization,
      refreshOrganizations,
      getCurrentUserRole,
      isAdmin,
      canAccessProperty,
      users,
      fetchUsers,
      addUser,
      updateUser,
      removeUser,
      resetPassword,
      adminResetPassword,
    ],
  );

  console.log("🚀 UnifiedAuth v60.0 - Provider render:", {
    hasCurrentUser: !!enhancedCurrentUser,
    currentUserEmail: enhancedCurrentUser?.email,
    currentUserRole: enhancedCurrentUser?.role,
    effectiveRole: effectiveRole,
    profileRole: currentUser?.role,
    loading,
    hasOrganization: !!currentOrganization,
    organizationName: currentOrganization?.name,
    timestamp: new Date().toISOString(),
  });

  return (
    <UnifiedAuthContext.Provider value={value}>
      {!initialCheckDone.current && !hasCompletedInitialSetup.current ? (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        children
      )}
    </UnifiedAuthContext.Provider>
  );
};
