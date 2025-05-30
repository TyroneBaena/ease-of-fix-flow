
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
        console.log("useMaintenanceRequestData - Fetching request from database, ID:", requestId);
        
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
        
        console.log("useMaintenanceRequestData - Database query result:");
        console.log("- Error:", freshRequestError);
        console.log("- Data:", freshRequestData);
        console.log("- Raw attachments from database:", freshRequestData?.attachments);
        console.log("- Attachments type:", typeof freshRequestData?.attachments);
          
        if (!freshRequestError && freshRequestData) {
          console.log("useMaintenanceRequestData - Successfully fetched fresh request data");
          console.log("useMaintenanceRequestData - About to format data...");
          
          const formattedRequest = formatRequestData(freshRequestData);
          
          console.log("useMaintenanceRequestData - Formatted request complete");
          console.log("useMaintenanceRequestData - Final formatted attachments:", formattedRequest.attachments);
          
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
      console.log("useMaintenanceRequestData - Falling back to context data");
      const foundRequest = requests.find(req => req.id === requestId);
      if (foundRequest) {
        console.log("useMaintenanceRequestData - Found request in context:", foundRequest);
        console.log("useMaintenanceRequestData - Context attachments:", foundRequest.attachments);
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
      console.log("useMaintenanceRequestData - Manual refresh: Fetching from database");
      
      const query = supabase
        .from('maintenance_requests')
        .select('*')
        .eq('id', requestId);
        
      // If not admin, add user filtering
      if (currentUser.role !== 'admin' && currentUser.role !== 'contractor') {
        query.eq('user_id', currentUser.id);
      }
        
      const { data, error } = await query.single();
      
      console.log("useMaintenanceRequestData - Manual refresh result:");
      console.log("- Error:", error);
      console.log("- Data:", data);
      console.log("- Raw attachments:", data?.attachments);
        
      if (!error && data) {
        console.log("useMaintenanceRequestData - Manual refresh: formatting data");
        const formattedRequest = formatRequestData(data);
        console.log("useMaintenanceRequestData - Manual refresh: final attachments:", formattedRequest.attachments);
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
    loading,
    refreshRequestData
  };
}
