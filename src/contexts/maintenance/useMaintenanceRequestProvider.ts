import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { MaintenanceRequest } from "@/types/maintenance";
import { useUnifiedAuth, waitForSessionReady } from "@/contexts/UnifiedAuthContext";
import { useMaintenanceRequestOperations } from "./useMaintenanceRequestOperations";
import { formatRequestData } from "@/hooks/request-detail/formatRequestData";
import { toast } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";
import { devLog } from "@/lib/devLogger";

/**
 * v86.0 PERFORMANCE: Removed excessive logging, using devLog for essential traces only
 */
export const useMaintenanceRequestProvider = () => {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { currentUser, isSessionReady, sessionVersion } = useUnifiedAuth();

  const operations = useMaintenanceRequestOperations(currentUser);
  const { fetchRequests, addRequest } = operations;

  const inFlightVersionRef = useRef<number | null>(null);

  // v86.0: Simplified loading with reduced logging
  const loadRequests = useCallback(
    async (targetVersion: number) => {
      const userId = currentUser?.id;

      if (!userId) {
        setLoading(false);
        return [];
      }

      setLoading(true);

      try {
        // Wait for session with retry
        let attempt = 1;
        let isReady = false;

        while (!isReady) {
          const delay = Math.min(500 * Math.pow(1.5, attempt - 1), 3000); // Faster backoff, capped at 3s
          isReady = await waitForSessionReady(targetVersion, 3000); // Reduced from 10s to 3s

          if (!isReady) {
            devLog(`MaintenanceRequest: Retry ${attempt}...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            attempt++;
          }
        }

        const fetchedRequests = await fetchRequests();

        if (fetchedRequests && fetchedRequests.length > 0) {
          const formattedRequests = fetchedRequests.map((request) => formatRequestData(request));
          setRequests(formattedRequests);
          inFlightVersionRef.current = null;
          return formattedRequests;
        } else {
          setRequests([]);
          inFlightVersionRef.current = null;
          return [];
        }
      } catch (error) {
        console.error("Error loading maintenance requests:", error);
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
    if (!currentUser?.id) {
      setRequests([]);
      setLoading(false);
      inFlightVersionRef.current = null;
      return;
    }

    // Prevent duplicate fetches from React StrictMode
    if (inFlightVersionRef.current === sessionVersion) {
      return;
    }

    inFlightVersionRef.current = sessionVersion;
    loadRequests(sessionVersion);

    // Real-time subscription for INSERT/DELETE/UPDATE
    const channelName = `maintenance_requests_${currentUser.id}`;
    
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
          devLog("MaintenanceRequest realtime:", payload.eventType);

          if (payload.eventType === "INSERT" && payload.new) {
            const formattedRequest = formatRequestData(payload.new);
            setRequests((prev) => {
              const exists = prev.some((r) => r.id === formattedRequest.id);
              if (exists) return prev;
              return [formattedRequest, ...prev];
            });
          } else if (payload.eventType === "UPDATE" && payload.new) {
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
      sessionVersion,
    }),
    [requests, loading, getRequestsForProperty, addRequestToProperty, loadRequests, sessionVersion],
  );

  return contextValue;
};
