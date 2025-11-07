
import { useState, useEffect, useRef } from 'react';
import { useMaintenanceRequestContext } from '@/contexts/maintenance';
import { supabase } from '@/lib/supabase';
import { MaintenanceRequest } from '@/types/maintenance';
import { toast } from 'sonner';
import { formatRequestData } from './formatRequestData';
import { useUserContext } from '@/contexts/UnifiedAuthContext';

/**
 * Hook to fetch and manage maintenance request data
 * v47.0: Fixed hanging setSession with timeout wrapper
 */
export function useMaintenanceRequestData(requestId: string | undefined, forceRefresh: number = 0, isSessionReady?: boolean) {
  const { requests } = useMaintenanceRequestContext();
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useUserContext();
  const previousSessionReadyRef = useRef(isSessionReady);

  useEffect(() => {
    const sessionJustBecameReady = !previousSessionReadyRef.current && isSessionReady;
    previousSessionReadyRef.current = isSessionReady;
    
    // v47.0: Wait for session ready before loading
    if (!isSessionReady) {
      console.log('⏳ v47.0 - Waiting for session to be ready...');
      setLoading(true); // v47.0: Always show loading while waiting for session
      return;
    }
    
    if (sessionJustBecameReady) {
      console.log('✅ v47.0 - Session ready, loading data');
    }
    
    if (!requestId || !currentUser) {
      setLoading(false);
      return;
    }
    
    const loadRequestData = async () => {
      setLoading(true); // v47.0: Always show loading when fetching data
      
      console.log("useMaintenanceRequestData - Loading request data for ID:", requestId);
      
      try {
        // Only fetch directly from database, avoid double fetching
        const query = supabase
          .from('maintenance_requests')
          .select('*')
          .eq('id', requestId);
          
        // Apply filtering based on user role
        if (currentUser.role === 'admin') {
          // Admins see all requests in their organization (RLS handles organization filtering)
        } else if (currentUser.role === 'manager') {
          // Managers see requests for properties they're assigned to
          const assignedProperties = currentUser.assignedProperties || [];
          if (assignedProperties.length > 0) {
            query.in('property_id', assignedProperties);
          } else {
            // If no assigned properties, fall back to user_id filtering
            query.eq('user_id', currentUser.id);
          }
        } else if (currentUser.role !== 'contractor') {
          // Regular users see only requests they created
          query.eq('user_id', currentUser.id);
        }
          
        const { data: requestData, error } = await query.maybeSingle();
        
        console.log("useMaintenanceRequestData - Database query result:");
        console.log("- Error:", error);
        console.log("- Data:", requestData);
          
        if (!error && requestData) {
          console.log("useMaintenanceRequestData - Successfully fetched request data");
          const formattedRequest = formatRequestData(requestData);
          console.log("useMaintenanceRequestData - Final formatted request:", formattedRequest);
          setRequest(formattedRequest);
        } else {
          console.log("useMaintenanceRequestData - Error or no request found:", error);
          // If no request found and not admin, show access denied message
          if (currentUser.role !== 'admin' && currentUser.role !== 'contractor') {
            toast.error("You don't have permission to view this request");
          } else {
            // Fallback to context data only if direct fetch fails
            const foundRequest = requests.find(req => req.id === requestId);
            if (foundRequest) {
              console.log("useMaintenanceRequestData - Using fallback from context:", foundRequest);
              setRequest(foundRequest);
            } else {
              console.log("useMaintenanceRequestData - Request not found");
              toast.error("Request not found");
            }
          }
        }
      } catch (err) {
        console.error("useMaintenanceRequestData - Error fetching data:", err);
        // Fallback to context data
        const foundRequest = requests.find(req => req.id === requestId);
        if (foundRequest) {
          console.log("useMaintenanceRequestData - Using fallback from context after error:", foundRequest);
          setRequest(foundRequest);
        } else {
          toast.error("Failed to load request");
        }
      }
      
      setLoading(false);
    };
    
    loadRequestData();
  }, [requestId, currentUser?.id, forceRefresh, isSessionReady]);

  // Function to refresh the request data directly from the database
  const refreshRequestData = async () => {
    if (!requestId || !currentUser) return;

    console.log("useMaintenanceRequestData - Manual refresh requested");

    try {
      const query = supabase
        .from('maintenance_requests')
        .select('*')
        .eq('id', requestId);
        
      // Apply filtering based on user role
      if (currentUser.role === 'admin') {
        // Admins see all requests in their organization (RLS handles organization filtering)
      } else if (currentUser.role === 'manager') {
        // Managers see requests for properties they're assigned to
        const assignedProperties = currentUser.assignedProperties || [];
        if (assignedProperties.length > 0) {
          query.in('property_id', assignedProperties);
        } else {
          // If no assigned properties, fall back to user_id filtering
          query.eq('user_id', currentUser.id);
        }
      } else if (currentUser.role !== 'contractor') {
        // Regular users see only requests they created
        query.eq('user_id', currentUser.id);
      }
        
      const { data, error } = await query.maybeSingle();
      
      console.log("useMaintenanceRequestData - Manual refresh result:");
      console.log("- Error:", error);
      console.log("- Data:", data);
        
      if (!error && data) {
        console.log("useMaintenanceRequestData - Manual refresh: formatting data");
        const formattedRequest = formatRequestData(data);
        console.log("useMaintenanceRequestData - Manual refresh: final request:", formattedRequest);
        setRequest(formattedRequest);
      } else {
        console.log("useMaintenanceRequestData - Manual refresh: Error or no request found:", error);
      }
    } catch (err) {
      console.error("useMaintenanceRequestData - Manual refresh: Error directly fetching request:", err);
    }
  };

  return {
    request,
    loading, // v47.0: Return actual loading state, no blocking
    refreshRequestData
  };
}
