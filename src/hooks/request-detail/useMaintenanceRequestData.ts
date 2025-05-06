
import { useState, useEffect } from 'react';
import { useMaintenanceRequestContext } from '@/contexts/maintenance';
import { supabase } from '@/lib/supabase';
import { MaintenanceRequest } from '@/types/maintenance';
import { toast } from 'sonner';
import { formatRequestData } from './formatRequestData';

/**
 * Hook to fetch and manage maintenance request data
 */
export function useMaintenanceRequestData(requestId: string | undefined, forceRefresh: number = 0) {
  const { requests, fetchRequests } = useMaintenanceRequestContext();
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requestId) return;
    
    const loadRequestData = async () => {
      setLoading(true);
      
      // Refresh the requests data if needed
      if (forceRefresh > 0) {
        console.log("useMaintenanceRequestData - Force refreshing request data");
        await fetchRequests();
      }
      
      // Try to get the latest request data directly from the database
      try {
        const { data: freshRequestData, error: freshRequestError } = await supabase
          .from('maintenance_requests')
          .select('*')
          .eq('id', requestId)
          .single();
          
        if (!freshRequestError && freshRequestData) {
          console.log("useMaintenanceRequestData - Fetched fresh request data:", freshRequestData);
          const formattedRequest = formatRequestData(freshRequestData);
          
          setRequest(formattedRequest);
          setLoading(false);
          return;
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
  }, [requestId, requests, forceRefresh, fetchRequests]);

  // Function to refresh the request data directly from the database
  const refreshRequestData = async () => {
    if (!requestId) return;

    console.log("useMaintenanceRequestData - Manual refresh requested");
    await fetchRequests();

    // Directly fetch the latest request data
    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('id', requestId)
        .single();
        
      if (!error && data) {
        console.log("useMaintenanceRequestData - Refresh fetched fresh data:", data);
        // Update the request with the fresh data
        const formattedRequest = formatRequestData(data);
        setRequest(formattedRequest);
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
