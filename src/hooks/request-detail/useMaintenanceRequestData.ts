import { useState, useEffect } from 'react';
import { useMaintenanceRequestContext } from '@/contexts/maintenance';
import { supabase } from '@/lib/supabase';
import { MaintenanceRequest } from '@/types/maintenance';
import { toast } from 'sonner';
import { formatRequestData } from './formatRequestData';
import { useUserContext } from '@/contexts/UserContext';

/**
 * Hook to fetch and manage maintenance request data
 */
export function useMaintenanceRequestData(requestId: string | undefined, forceRefresh: number = 0) {
  const { requests, fetchRequests } = useMaintenanceRequestContext();
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useUserContext();

  useEffect(() => {
    if (!requestId || !currentUser) return;
    
    const loadRequestData = async () => {
      setLoading(true);
      
      // Refresh the requests data if needed
      if (forceRefresh > 0) {
        console.log("useMaintenanceRequestData - Force refreshing request data");
        await fetchRequests();
      }
      
      // Try to get the latest request data directly from the database
      try {
        // Add user filtering to ensure users only see their own data
        const query = supabase
          .from('maintenance_requests')
          .select('*')
          .eq('id', requestId);
          
        // If not admin, add user filtering
        if (currentUser.role !== 'admin' && currentUser.role !== 'contractor') {
          query.eq('user_id', currentUser.id);
        }
          
        const { data: freshRequestData, error: freshRequestError } = await query.single();
          
        if (!freshRequestError && freshRequestData) {
          console.log("useMaintenanceRequestData - Fetched fresh request data:", freshRequestData);
          const formattedRequest = formatRequestData(freshRequestData);
          
          setRequest(formattedRequest);
          setLoading(false);
          return;
        } else {
          console.log("useMaintenanceRequestData - Error or no request found:", freshRequestError);
          // If no request found and not admin, show access denied message
          if (currentUser.role !== 'admin' && currentUser.role !== 'contractor') {
            toast.error("You don't have permission to view this request");
            setRequest(null);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.log("useMaintenanceRequestData - Error fetching fresh data, falling back to context:", err);
      }
      
      // Fall back to data from the context if direct fetch fails
      const foundRequest = requests.find(req => req.id === requestId);
      if (foundRequest) {
        console.log("useMaintenanceRequestData - Found request in context:", foundRequest);
        console.log("useMaintenanceRequestData - contractorId:", foundRequest.contractorId);
        console.log("useMaintenanceRequestData - status:", foundRequest.status);
        console.log("useMaintenanceRequestData - assignedTo:", foundRequest.assignedTo);
        setRequest(foundRequest);
      } else {
        console.log("useMaintenanceRequestData - Request not found for ID:", requestId);
        toast.error("Request not found");
      }
      
      setLoading(false);
    };
    
    loadRequestData();
  }, [requestId, requests, forceRefresh, fetchRequests, currentUser]);

  // Function to refresh the request data directly from the database
  const refreshRequestData = async () => {
    if (!requestId || !currentUser) return;

    console.log("useMaintenanceRequestData - Manual refresh requested");
    await fetchRequests();

    // Directly fetch the latest request data
    try {
      const query = supabase
        .from('maintenance_requests')
        .select('*')
        .eq('id', requestId);
        
      // If not admin, add user filtering
      if (currentUser.role !== 'admin' && currentUser.role !== 'contractor') {
        query.eq('user_id', currentUser.id);
      }
        
      const { data, error } = await query.single();
        
      if (!error && data) {
        console.log("useMaintenanceRequestData - Refresh fetched fresh data:", data);
        // Update the request with the fresh data
        const formattedRequest = formatRequestData(data);
        setRequest(formattedRequest);
      } else {
        console.log("useMaintenanceRequestData - Error or no request found:", error);
      }
    } catch (err) {
      console.error("useMaintenanceRequestData - Error directly fetching request:", err);
    }
  };

  return {
    request,
    loading,
    refreshRequestData
  };
}
