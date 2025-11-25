// import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// import { MaintenanceRequest } from '@/types/maintenance';
// import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
// import { useMaintenanceRequestOperations } from './useMaintenanceRequestOperations';
// import { formatRequestData } from '@/hooks/request-detail/formatRequestData';
// import { toast } from '@/lib/toast';
// import { supabase } from '@/integrations/supabase/client';

// /**
//  * v78.0: SIMPLIFIED - Pure data fetching, no complex refresh logic
//  * Let React Query handle all refetching via refetchOnWindowFocus
//  */
// export const useMaintenanceRequestProvider = () => {
//   const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const { currentUser, isSessionReady } = useUnifiedAuth();

//   const operations = useMaintenanceRequestOperations(currentUser);
//   const { fetchRequests, addRequest } = operations;

//   const lastFetchedUserIdRef = useRef<string | null>(null);
//   const authStateRef = useRef({ isSessionReady, currentUser });

//   useEffect(() => {
//     authStateRef.current = { isSessionReady, currentUser };
//   }, [isSessionReady, currentUser]);

//   const loadRequests = useCallback(async () => {
//     const { isSessionReady: sessionReady, currentUser: user } = authStateRef.current;
//     const userId = user?.id;

//     console.log('🔍 v78.0 - Loading requests', { sessionReady, hasUser: !!userId });

//     if (!sessionReady) {
//       console.log('🔍 v78.0 - Waiting for session ready...');
//       return [];
//     }

//     if (!userId) {
//       console.log('🔍 v78.0 - No user, skipping');
//       setLoading(false);
//       return [];
//     }

//     setLoading(true);

//     try {
//       console.log('🔍 v78.0 - Fetching requests...');
//       const fetchedRequests = await fetchRequests();

//       console.log('🔍 v78.0 - Fetched:', fetchedRequests?.length, 'requests');

//       if (fetchedRequests && fetchedRequests.length > 0) {
//         const formattedRequests = fetchedRequests.map(request => formatRequestData(request));
//         setRequests(formattedRequests);
//         return formattedRequests;
//       } else {
//         setRequests([]);
//         return [];
//       }
//     } catch (error) {
//       console.error('🔍 v78.0 - Error loading requests:', error);
//       setRequests([]);
//       return [];
//     } finally {
//       setLoading(false);
//     }
//   }, [fetchRequests]);

//   useEffect(() => {
//     console.log('🚨 v78.0 - MaintenanceRequest useEffect triggered');

//     if (!isSessionReady) {
//       console.log('🚨 v78.0 - Waiting for session ready...');
//       return;
//     }

//     if (!currentUser?.id) {
//       console.log('🚨 v78.0 - No current user, clearing requests');
//       setRequests([]);
//       setLoading(false);
//       lastFetchedUserIdRef.current = null;
//       return;
//     }

//     // Only fetch if user ID changed
//     if (lastFetchedUserIdRef.current === currentUser.id) {
//       console.log('🚨 v78.0 - User unchanged, skipping fetch');
//       return;
//     }

//     lastFetchedUserIdRef.current = currentUser.id;
//     console.log('🚨 v78.0 - Loading requests for user:', currentUser.email);

//     loadRequests();

//     // Real-time subscription
//     console.log('🔌 REAL-TIME: Setting up maintenance_requests subscription');
//     const channel = supabase
//       .channel('maintenance-requests-changes')
//       .on(
//         'postgres_changes',
//         {
//           event: '*',
//           schema: 'public',
//           table: 'maintenance_requests'
//         },
//         (payload) => {
//           console.log('🔄 REAL-TIME: Maintenance request change:', payload.eventType);

//           if (payload.eventType === 'INSERT' && payload.new) {
//             const formattedRequest = formatRequestData(payload.new);
//             setRequests(prev => {
//               const exists = prev.some(r => r.id === formattedRequest.id);
//               if (exists) return prev;
//               return [formattedRequest, ...prev];
//             });
//           } else if (payload.eventType === 'UPDATE' && payload.new) {
//             const formattedRequest = formatRequestData(payload.new);
//             setRequests(prev => prev.map(r =>
//               r.id === formattedRequest.id ? formattedRequest : r
//             ));
//           } else if (payload.eventType === 'DELETE' && payload.old) {
//             setRequests(prev => prev.filter(r => r.id !== payload.old.id));
//           }
//         }
//       )
//       .subscribe();

//     return () => {
//       console.log('🔌 REAL-TIME: Unsubscribing from maintenance requests');
//       supabase.removeChannel(channel);
//     };
//   }, [currentUser?.id, isSessionReady, loadRequests]);

//   const getRequestsForProperty = useCallback((propertyId: string) => {
//     return requests.filter(request => request.propertyId === propertyId);
//   }, [requests]);

//   const addRequestToProperty = useCallback(async (requestData: Omit<MaintenanceRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
//     console.log('🆕 addRequestToProperty - Starting');

//     const requestWithDefaults = {
//       ...requestData,
//       site: requestData.site || requestData.category || 'Unknown',
//       title: requestData.title || requestData.issueNature || 'Untitled Request',
//       location: requestData.location || 'Unknown',
//       submittedBy: requestData.submittedBy || 'Anonymous'
//     };

//     const newRequest = await addRequest(requestWithDefaults);

//     if (newRequest) {
//       const formattedNewRequest = formatRequestData(newRequest);
//       setRequests(prev => {
//         const existingIndex = prev.findIndex(r => r.id === formattedNewRequest.id);
//         if (existingIndex !== -1) {
//           const updated = [...prev];
//           updated[existingIndex] = formattedNewRequest;
//           return updated;
//         }
//         return [formattedNewRequest, ...prev];
//       });

//       toast.success('Maintenance request added successfully. Redirecting...', { duration: 1500 });
//       window.location.replace(`${window.location.origin}/dashboard`);

//       return formattedNewRequest;
//     }
//     return null;
//   }, [addRequest]);

//   const contextValue = useMemo(() => ({
//     requests,
//     loading,
//     getRequestsForProperty,
//     addRequestToProperty,
//     loadRequests,
//   }), [
//     requests,
//     loading,
//     getRequestsForProperty,
//     addRequestToProperty,
//     loadRequests
//   ]);

//   return contextValue;
// };

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { MaintenanceRequest } from "@/types/maintenance";
import { useUnifiedAuth, waitForSessionReady } from "@/contexts/UnifiedAuthContext";
import { useMaintenanceRequestOperations } from "./useMaintenanceRequestOperations";
import { formatRequestData } from "@/hooks/request-detail/formatRequestData";
import { toast } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";

/**
 * v84.0 COMPREHENSIVE FIX: Retry pattern with stabilized dependencies
 * - Uses waitForSessionReadyWithRetry to handle cancelled waiters during rapid tab switches
 * - Passes sessionVersion as targetVersion for proper coordination
 * - Stabilized useCallback to prevent duplicate fetches
 */
export const useMaintenanceRequestProvider = () => {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { currentUser, isSessionReady, sessionVersion } = useUnifiedAuth();

  const operations = useMaintenanceRequestOperations(currentUser);
  const { fetchRequests, addRequest } = operations;

  const inFlightVersionRef = useRef<number | null>(null);

  // v84.1 FIX: Infinite retry with in-flight tracking to prevent duplicate fetches
  const loadRequests = useCallback(
    async (targetVersion: number) => {
      const userId = currentUser?.id;

      console.log(`🔧 v84.1 - MaintenanceRequest: Starting fetch for version ${targetVersion}`, { hasUser: !!userId });

      if (!userId) {
        console.log("🔧 v84.1 - MaintenanceRequest: No user, skipping");
        setLoading(false);
        return [];
      }

      setLoading(true);

      try {
        // v101.0 FIX: Bounded retry to prevent infinite hangs
        // Keep retrying with exponential backoff but cap at 3 attempts
        const maxAttempts = 3;
        let attempt = 1;
        let isReady = false;

        while (!isReady && attempt <= maxAttempts) {
          const delay = Math.min(500 * Math.pow(2, attempt - 1), 5000); // Cap at 5s
          console.log(`🔧 v101.0 - MaintenanceRequest: Attempt ${attempt}/${maxAttempts} for version ${targetVersion}`);

          isReady = await waitForSessionReady(targetVersion, 10000);

          if (!isReady && attempt < maxAttempts) {
            console.log(`🔧 v101.0 - MaintenanceRequest: Retry ${attempt} failed, waiting ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            attempt++;
          }
        }

        if (!isReady) {
          console.warn(`⚠️ v101.0 - MaintenanceRequest: Session ready timeout after ${maxAttempts} attempts - proceeding anyway`);
        } else {
          console.log(`🔧 v101.0 - MaintenanceRequest: Session ready after ${attempt} attempts, fetching...`);
        }
        const fetchedRequests = await fetchRequests();

        console.log(`✅ v84.1 - Maintenance requests fetched: ${fetchedRequests?.length || 0}`);

        if (fetchedRequests && fetchedRequests.length > 0) {
          const formattedRequests = fetchedRequests.map((request) => formatRequestData(request));
          setRequests(formattedRequests);
          inFlightVersionRef.current = null; // Clear in-flight marker
          return formattedRequests;
        } else {
          setRequests([]);
          inFlightVersionRef.current = null;
          return [];
        }
      } catch (error) {
        console.error("❌ v84.1 - Error loading requests:", error);
        setRequests([]);
        inFlightVersionRef.current = null;
        return [];
      } finally {
        setLoading(false);
      }
    },
    [currentUser?.id, fetchRequests],
  );

  useEffect(() => {
    console.log("🔧 v85.0 - MaintenanceRequest: useEffect triggered", {
      hasUser: !!currentUser?.id,
      sessionVersion,
      inFlight: inFlightVersionRef.current,
    });

    if (!currentUser?.id) {
      console.log("🔧 v85.0 - MaintenanceRequest: No user, clearing requests");
      setRequests([]);
      setLoading(false);
      inFlightVersionRef.current = null;
      return;
    }

    // v84.1 FIX: Mark version as in-flight BEFORE starting fetch
    // This prevents duplicate fetches from React StrictMode double-mounting
    if (inFlightVersionRef.current === sessionVersion) {
      console.log(`🔧 v85.0 - MaintenanceRequest: Already fetching version ${sessionVersion}, skipping`);
      return;
    }

    console.log(`🔧 v85.0 - MaintenanceRequest: Fetching for version ${sessionVersion}`);
    inFlightVersionRef.current = sessionVersion; // Mark as in-flight BEFORE fetch starts
    loadRequests(sessionVersion);

    // Real-time subscription for INSERT/DELETE (UPDATE handled by manual refresh)
    const channelName = `maintenance_requests_${currentUser.id}`;
    console.log("🔌 v85.0 REAL-TIME: Setting up subscription");
    
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "maintenance_requests",
        },
        (payload) => {
          console.log("🔄 v85.0 REAL-TIME: Event:", payload.eventType);

          if (payload.eventType === "INSERT" && payload.new) {
            const formattedRequest = formatRequestData(payload.new);
            setRequests((prev) => {
              const exists = prev.some((r) => r.id === formattedRequest.id);
              if (exists) return prev;
              return [formattedRequest, ...prev];
            });
          } else if (payload.eventType === "UPDATE" && payload.new) {
            // UPDATE handled by manual refresh in useEditRequest
            const formattedRequest = formatRequestData(payload.new);
            setRequests((prev) => prev.map((r) => 
              r.id === formattedRequest.id ? formattedRequest : r
            ));
          } else if (payload.eventType === "DELETE" && payload.old) {
            setRequests((prev) => prev.filter((r) => r.id !== (payload.old as any).id));
          }
        },
      )
      .subscribe();

    return () => {
      console.log("🔌 v85.0 REAL-TIME: Cleaning up");
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, sessionVersion, loadRequests]);

  const getRequestsForProperty = useCallback(
    (propertyId: string) => {
      return requests.filter((request) => request.propertyId === propertyId);
    },
    [requests],
  );

  const addRequestToProperty = useCallback(
    async (requestData: Omit<MaintenanceRequest, "id" | "status" | "createdAt" | "updatedAt">) => {
      console.log("🆕 addRequestToProperty - Starting");

      const requestWithDefaults = {
        ...requestData,
        site: requestData.site || requestData.category || "Unknown",
        title: requestData.title || requestData.issueNature || "Untitled Request",
        location: requestData.location || "Unknown",
        submittedBy: requestData.submittedBy || "Anonymous",
      };

      const newRequest = await addRequest(requestWithDefaults);

      if (newRequest) {
        const formattedNewRequest = formatRequestData(newRequest);
        setRequests((prev) => {
          const existingIndex = prev.findIndex((r) => r.id === formattedNewRequest.id);
          if (existingIndex !== -1) {
            const updated = [...prev];
            updated[existingIndex] = formattedNewRequest;
            return updated;
          }
          return [formattedNewRequest, ...prev];
        });

        toast.success("Maintenance request added successfully!");
        // Note: Navigation handled by component after receiving response

        return formattedNewRequest;
      }
      return null;
    },
    [addRequest],
  );

  const contextValue = useMemo(
    () => ({
      requests,
      loading,
      getRequestsForProperty,
      addRequestToProperty,
      loadRequests,
      sessionVersion, // Export sessionVersion for context to use
    }),
    [requests, loading, getRequestsForProperty, addRequestToProperty, loadRequests, sessionVersion],
  );

  return contextValue;
};
