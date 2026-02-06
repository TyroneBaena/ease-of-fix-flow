import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { User, UserRole } from "@/types/user";
import { toast } from "@/lib/toast";
import { setSentryUser } from "@/lib/sentry";
import { devLog, devWarn } from "@/lib/devLogger";

// Helper: Wrap any promise with a timeout to prevent indefinite hangs
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
  currentUser: User | null;
  session: Session | null;
  loading: boolean;
  isInitialized: boolean;
  isSessionReady: boolean;
  sessionVersion: number;
  isSigningOut: boolean;
  signOut: () => Promise<void>;
  currentOrganization: Organization | null;
  userOrganizations: UserOrganization[];
  switchOrganization: (organizationId: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
  getCurrentUserRole: () => string;
  isAdmin: boolean;
  canAccessProperty: (propertyId: string) => boolean;
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

// Deferred promise helper for session synchronization
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

// Session ready coordinator
const sessionReadyCoordinator = {
  latestReadyVersion: 0,
  pendingWaiters: new Map<number, Set<Deferred<boolean>>>(),
};

/**
 * Wait for session to be ready at specific version
 * Timeout reduced from 10s to 3s for faster page navigation
 */
export async function waitForSessionReady(targetVersion?: number, timeout = 3000): Promise<boolean> {
  const target = targetVersion ?? sessionReadyCoordinator.latestReadyVersion;

  // Check if already ready BEFORE creating promise
  if (sessionReadyCoordinator.latestReadyVersion >= target) {
    return true;
  }

  // Not ready yet - create waiter and add to pending set
  const deferred = createDeferred<boolean>();

  if (!sessionReadyCoordinator.pendingWaiters.has(target)) {
    sessionReadyCoordinator.pendingWaiters.set(target, new Set());
  }
  sessionReadyCoordinator.pendingWaiters.get(target)!.add(deferred);

  // Race between signal and timeout
  const timeoutId = setTimeout(() => {
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
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("waitForSessionReady error:", error);
    return false;
  }
}

/**
 * Signal that session is ready at given version
 */
export function signalSessionReady(version: number) {
  if (version > sessionReadyCoordinator.latestReadyVersion) {
    sessionReadyCoordinator.latestReadyVersion = version;
  }

  // Resolve ALL waiters for this version and earlier
  for (const [waitingVersion, waiters] of sessionReadyCoordinator.pendingWaiters.entries()) {
    if (waitingVersion <= version) {
      waiters.forEach((deferred) => deferred.resolve(true));
      sessionReadyCoordinator.pendingWaiters.delete(waitingVersion);
    }
  }
}

/**
 * Log session refresh start (waiters timeout naturally if not resolved)
 */
export function startSessionRefresh(currentSessionVersion: number): void {
  devLog("Session refresh started:", currentSessionVersion);
}

/**
 * Retry wrapper with exponential backoff
 */
export async function waitForSessionReadyWithRetry(
  targetVersion: number,
  maxRetries: number = 3,
  baseDelay: number = 500,
  timeout: number = 3000,
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const isReady = await waitForSessionReady(targetVersion, timeout);

    if (isReady) {
      return true;
    }

    if (attempt < maxRetries) {
      const delay = Math.min(baseDelay * Math.pow(1.5, attempt - 1), 2000);
      await new Promise((resolve) => setTimeout(resolve, delay));
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
    refreshUser: context.refreshOrganizations,
    currentOrganization: context.currentOrganization,
  };
};

export const useMultiOrganizationContext = () => {
  const context = useUnifiedAuth();
  return {
    currentOrganization: context.currentOrganization,
    userOrganizations: context.userOrganizations,
    loading: context.loading,
    error: null,
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

// Session-version-scoped deduplication to prevent concurrent conversions
const conversionCache = new Map<string, { promise: Promise<User>; sessionVersion: number }>();

// Simple user conversion with session-version-scoped deduplication
const convertSupabaseUser = async (supabaseUser: SupabaseUser, currentSessionVersion: number): Promise<User> => {
  const cacheKey = supabaseUser.id;
  const cached = conversionCache.get(cacheKey);

  // Only dedupe if conversion is in-flight for the SAME session version
  if (cached && cached.sessionVersion === currentSessionVersion) {
    return cached.promise;
  }

  const promise = (async () => {
    try {
      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", supabaseUser.id)
          .maybeSingle();

        if (profileError) {
          devWarn("Profile query error:", profileError.message);
        }

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

        return user;
      } catch (queryError: any) {
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
      console.error("Error converting user:", error);
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
    } finally {
      conversionCache.delete(cacheKey);
    }
  })();

  conversionCache.set(cacheKey, { promise, sessionVersion: currentSessionVersion });

  return promise;
};

export const UnifiedAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [sessionVersion, setSessionVersion] = useState(0);
  const initialCheckDone = useRef(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const hasCompletedInitialSetup = useRef(false);
  const authenticatedUserIdRef = useRef<string | null>(null);

  // Organization state
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<UserOrganization[]>([]);

  // User management state
  const [users, setUsers] = useState<User[]>([]);

  // Deduplication tracking
  const deduplicationRef = useRef({ isConverting: false, promise: null as Promise<User> | null });

  // Refs for visibility coordinator
  const sessionRef = useRef<Session | null>(null);
  const currentUserRef = useRef<User | null>(null);

  const signOut = useCallback(async () => {
    try {
      setIsSigningOut(true);
      setSentryUser(null);

      const { performRobustSignOut } = await import("@/utils/authCleanup");

      const signOutPromise = performRobustSignOut(supabase);
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(true), 2000));

      await Promise.race([signOutPromise, timeoutPromise]);

      setCurrentUser(null);
      setSession(null);
      setIsSessionReady(false);
      setUserOrganizations([]);
      setCurrentOrganization(null);

      toast.success("Signed out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
      setCurrentUser(null);
      setSession(null);
      setUserOrganizations([]);
      setCurrentOrganization(null);
      toast.error("Error signing out");
    }
  }, []);

  const fetchUserOrganizations = async (user: User) => {
    if (!user?.id) {
      setUserOrganizations([]);
      setCurrentOrganization(null);
      return null;
    }

    try {
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from("user_organizations")
        .select(`*, organization_id, role, is_active, is_default`)
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (userOrgsError) {
        throw userOrgsError;
      }

      if (!userOrgs || userOrgs.length === 0) {
        setUserOrganizations([]);
        setCurrentOrganization(null);
        return user.organization_id || null;
      }

      const orgIds = userOrgs.map((uo: any) => uo.organization_id);

      const { data: organizations, error: orgsError } = await supabase
        .from("organizations")
        .select("*")
        .in("id", orgIds);

      if (orgsError) {
        throw orgsError;
      }

      const mappedUserOrganizations = userOrgs
        .map((uo: any) => {
          const organization = organizations?.find((org) => org.id === uo.organization_id);
          return { ...uo, organization: organization as Organization };
        })
        .filter((uo: any) => uo.organization);

      setUserOrganizations(mappedUserOrganizations);

      if (mappedUserOrganizations.length > 0) {
        let targetOrg: Organization | null = null;

        if (user.session_organization_id) {
          const sessionOrg = mappedUserOrganizations.find(
            (uo: any) => uo.organization_id === user.session_organization_id,
          );
          if (sessionOrg) {
            targetOrg = sessionOrg.organization;
          }
        }

        if (!targetOrg) {
          const defaultOrg = mappedUserOrganizations.find((uo: any) => uo.is_default);
          if (defaultOrg) {
            targetOrg = defaultOrg.organization;
          }
        }

        if (!targetOrg) {
          targetOrg = mappedUserOrganizations[0].organization;
        }

        setCurrentOrganization(targetOrg);
        return targetOrg?.id || null;
      }

      return user.organization_id || null;
    } catch (error) {
      console.error("Error in fetchUserOrganizations:", error);
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
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const freshUser = await convertSupabaseUser(authUser, sessionVersion);
      if (freshUser) {
        setCurrentUser(freshUser);
        await fetchUserOrganizations(freshUser);
      }
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

  const effectiveRole = useMemo(() => {
    if (!currentUser) return "manager";

    if (currentOrganization && userOrganizations.length > 0) {
      const userOrg = userOrganizations.find((uo) => uo.organization_id === currentOrganization.id);
      if (userOrg) {
        return userOrg.role;
      }
    }

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

  const enhancedCurrentUser = useMemo(() => {
    if (!currentUser) return null;

    if (currentUser.role === effectiveRole) {
      return currentUser;
    }

    return { ...currentUser, role: effectiveRole as UserRole };
  }, [currentUser, effectiveRole]);

  // User management functions
  const fetchUsers = useCallback(async () => {
    const isAdminRole = effectiveRole === "admin";

    if (!isAdminRole) {
      return;
    }

    try {
      const { fetchAllUsers } = await import("@/services/user/userQueries");

      const userData = await fetchAllUsers(isSessionReady);

      const convertedUsers = userData.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedProperties: user.assignedProperties || [],
        createdAt: user.createdAt,
        organization_id: user.organization_id,
      }));

      setUsers(convertedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, [effectiveRole]);

  const addUser = useCallback(
    async (email: string, name: string, role: UserRole, assignedProperties?: string[]): Promise<AddUserResult> => {
      return {
        success: false,
        message: "User management not fully implemented yet",
        email,
      };
    },
    [],
  );

  const updateUser = useCallback(async (user: User) => {
    devLog("updateUser called:", user.id);
  }, []);

  const removeUser = useCallback(async (userId: string) => {
    devLog("removeUser called:", userId);
  }, []);

  const resetPassword = useCallback(async (userId: string, email: string) => {
    try {
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
        return { success: false, message: error.message || "Password reset failed" };
      }

      return { success: true, message: `Password reset email sent to ${email}` };
    } catch (error: any) {
      console.error("Error in resetPassword:", error);
      return { success: false, message: error.message || "Unknown error occurred" };
    }
  }, []);

  const adminResetPassword = useCallback(async (userId: string, email: string) => {
    try {
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
        return { success: false, message: error.message || "Password reset failed" };
      }

      return { success: true, message: `Password reset email sent to ${email}` };
    } catch (error: any) {
      console.error("Error in adminResetPassword:", error);
      return { success: false, message: error.message || "Unknown error occurred" };
    }
  }, []);

  // Update refs whenever session or currentUser changes
  useEffect(() => {
    sessionRef.current = session;
    currentUserRef.current = currentUser;
  }, [session, currentUser]);

  // Session freshness check refs
  const isRefreshInFlight = useRef<boolean>(false);
  const refreshInFlightRef = useRef<Promise<boolean> | null>(null);

  const REFRESH_TIMEOUT_MS = 5000;
  const SESSION_REFRESH_THRESHOLD_SECONDS = 5 * 60;

  // Session restoration with freshness check
  useEffect(() => {
    const refreshAuth = async (): Promise<boolean> => {
      if (isRefreshInFlight.current && refreshInFlightRef.current) {
        return refreshInFlightRef.current;
      }

      startSessionRefresh(sessionVersion);

      isRefreshInFlight.current = true;
      const refreshPromise = (async () => {
        let sessionRestored = false;

        try {
          const { data: { session: currentSession }, error: getSessionError } = await withTimeout(
            supabase.auth.getSession(),
            2000,
            "getSession() timed out after 2s",
          ).catch((timeoutError) => {
            console.error("getSession TIMEOUT:", timeoutError.message);
            return { data: { session: null }, error: timeoutError };
          });

          if (getSessionError) {
            setIsSessionReady(false);
            return false;
          }

          if (currentSession?.access_token && currentSession.expires_at) {
            const expiresAt = currentSession.expires_at;
            const now = Math.floor(Date.now() / 1000);
            const secondsUntilExpiration = expiresAt - now;

            if (secondsUntilExpiration > SESSION_REFRESH_THRESHOLD_SECONDS) {
              setIsSessionReady(true);
              sessionRestored = true;
              setSessionVersion((v) => {
                const next = v + 1;
                return next;
              });
              return true;
            }
          } else {
            setIsSessionReady(false);
            return false;
          }

          const { data: { session }, error } = await withTimeout(
            supabase.auth.refreshSession(),
            REFRESH_TIMEOUT_MS,
            "refreshSession() timed out after 5s",
          ).catch((timeoutError) => {
            console.error("refreshSession TIMEOUT:", timeoutError.message);
            return { data: { session: null }, error: timeoutError };
          });

          if (error) {
            const errorMessage = error.message || String(error);
            const isSessionMissing =
              errorMessage.includes("session missing") ||
              errorMessage.includes("Auth session missing") ||
              errorMessage.includes("No session");

            if (isSessionMissing) {
              try {
                const { data: { session: fallbackSession } } = await withTimeout(
                  supabase.auth.getSession(),
                  2000,
                  "getSession() fallback timed out",
                );

                if (fallbackSession?.access_token) {
                  setIsSessionReady(true);
                  sessionRestored = true;
                  setSessionVersion((v) => v + 1);
                  return true;
                }
              } catch (fallbackError) {
                console.error("Fallback getSession() also failed:", fallbackError);
              }
            }

            setIsSessionReady(false);
            return false;
          }

          if (session?.access_token) {
            setIsSessionReady(true);
            sessionRestored = true;
            setSessionVersion((v) => v + 1);
            return true;
          }

          setIsSessionReady(false);
          return false;
        } catch (error) {
          console.error("SESSION CHECK CRITICAL ERROR:", error);
          setIsSessionReady(false);
          return false;
        } finally {
          isRefreshInFlight.current = false;
          refreshInFlightRef.current = null;

          setSessionVersion((currentVersion) => {
            signalSessionReady(currentVersion);
            return currentVersion;
          });
        }
      })();

      refreshInFlightRef.current = refreshPromise;
      return refreshPromise;
    };

    return () => {
      isRefreshInFlight.current = false;
      refreshInFlightRef.current = null;
    };
  }, []);

  useEffect(() => {
    const startTime = performance.now();

    let currentAuthTicket = 0;
    const getNextAuthTicket = () => ++currentAuthTicket;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      devLog("Auth state changed:", event, "Session exists:", !!session);

      startSessionRefresh(sessionVersion);

      if (event === "SIGNED_IN" && session?.user) {
        const myAuthTicket = getNextAuthTicket();

        setSession(session);

        setTimeout(async () => {
          try {
            const user = await convertSupabaseUser(session.user, sessionVersion);

            try {
              const { data: profileCheck } = await supabase
                .from('profiles')
                .select('must_change_password')
                .eq('id', session.user.id)
                .single();
              
              if (profileCheck?.must_change_password === true) {
                sessionStorage.setItem('force_password_change', 'true');
                sessionStorage.setItem('password_reset_email', session.user.email || '');
              }
            } catch (profileCheckError) {
              devWarn("Could not check must_change_password flag:", profileCheckError);
            }

            setCurrentUser(user);
            authenticatedUserIdRef.current = user.id;

            setIsSessionReady(true);
            setSessionVersion((v) => {
              const next = v + 1;
              signalSessionReady(next);
              return next;
            });

            setLoading(false);

            setSentryUser({
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            });

            fetchUserOrganizations(user).catch((orgError) => {
              devWarn("Non-critical org fetch error:", orgError);
            });
          } catch (error) {
            console.error("Error in deferred user conversion:", error);
            setCurrentUser(null);
            setSession(null);

            setIsSessionReady(false);
            setSessionVersion((v) => {
              signalSessionReady(v);
              return v;
            });

            setLoading(false);
            setSentryUser(null);
          }
        }, 0);
      } else if (event === "SIGNED_OUT") {
        setLoading(false);
        setCurrentUser(null);
        setSession(null);
        setIsSessionReady(false);
        setUserOrganizations([]);
        setCurrentOrganization(null);
        setIsSigningOut(false);
        authenticatedUserIdRef.current = null;

        setSentryUser(null);
      } else if (event === "INITIAL_SESSION") {
        if (session?.user) {
          devLog("INITIAL_SESSION with user:", session.user.email);
        }
      } else {
        setLoading(false);
      }
    });

    const initialSessionTicket = getNextAuthTicket();

    const sessionTimeout = setTimeout(() => {
      console.error("getSession() timeout! Forcing loading to false");
      setLoading(false);
      initialCheckDone.current = true;
      toast.error("Authentication initialization timed out. Please refresh the page.");
    }, 8000);

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        clearTimeout(sessionTimeout);
        const timeElapsed = ((performance.now() - startTime) / 1000).toFixed(2);
        devLog(`Initial session check completed in ${timeElapsed}s:`, session ? session.user?.email : "No session");

        if (session?.user) {
          setSession(session);

          setTimeout(async () => {
            try {
              const user = await convertSupabaseUser(session.user, 1);

              setCurrentUser(user);

              setIsSessionReady(true);
              setSessionVersion((v) => {
                const next = v + 1;
                signalSessionReady(next);
                return next;
              });

              setLoading(false);
              initialCheckDone.current = true;
              hasCompletedInitialSetup.current = true;

              fetchUserOrganizations(user).catch((orgError) => {
                console.error("Non-critical org error on initial load:", orgError);
              });
            } catch (error) {
              console.error("Error converting initial user:", error);
              setCurrentUser(null);
              setSession(null);

              setIsSessionReady(false);
              setSessionVersion((v) => {
                signalSessionReady(v);
                return v;
              });

              setLoading(false);
              initialCheckDone.current = true;
            }
          }, 0);
        } else {
          setLoading(false);
          initialCheckDone.current = true;
        }
      })
      .catch((error) => {
        clearTimeout(sessionTimeout);
        console.error("Error getting session:", error);
        setCurrentUser(null);
        setSession(null);
        setIsSessionReady(false);
        setLoading(false);
        initialCheckDone.current = true;
        toast.error("Error initializing authentication. Please refresh the page.");
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch users when user becomes admin - ONCE per session
  useEffect(() => {
    if (isAdmin && !loading && currentOrganization && users.length === 0) {
      fetchUsers();
    }
  }, [isAdmin, loading]);

  const value: UnifiedAuthContextType = useMemo(
    () => ({
      currentUser: enhancedCurrentUser,
      session,
      loading: hasCompletedInitialSetup.current ? false : loading,
      isInitialized: initialCheckDone.current,
      isSessionReady,
      sessionVersion,
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
      loading,
      isSessionReady,
      sessionVersion,
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

  devLog("UnifiedAuth render:", {
    hasUser: !!enhancedCurrentUser,
    loading,
    hasOrganization: !!currentOrganization,
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
