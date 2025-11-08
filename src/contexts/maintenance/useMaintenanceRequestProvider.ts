
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MaintenanceRequest } from '@/types/maintenance';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { useMaintenanceRequestOperations } from './useMaintenanceRequestOperations';
import { formatRequestData } from '@/hooks/request-detail/formatRequestData';
import { toast } from '@/lib/toast';
import { supabase } from '@/integrations/supabase/client';

/**
 * v78.0: SIMPLIFIED - Pure data fetching, no complex refresh logic
 * Let React Query handle all refetching via refetchOnWindowFocus
 */
export const useMaintenanceRequestProvider = () => {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { currentUser, isSessionReady } = useUnifiedAuth();
  
  const operations = useMaintenanceRequestOperations(currentUser);
  const { fetchRequests, addRequest } = operations;
  
  const lastFetchedUserIdRef = useRef<string | null>(null);
  const authStateRef = useRef({ isSessionReady, currentUser });
  
  useEffect(() => {
    authStateRef.current = { isSessionReady, currentUser };
  }, [isSessionReady, currentUser]);

  const loadRequests = useCallback(async () => {
    const { isSessionReady: sessionReady, currentUser: user } = authStateRef.current;
    const userId = user?.id;
    
    console.log('🔍 v78.0 - Loading requests', { sessionReady, hasUser: !!userId });
    
    if (!sessionReady) {
      console.log('🔍 v78.0 - Waiting for session ready...');
      return [];
    }
    
    if (!userId) {
      console.log('🔍 v78.0 - No user, skipping');
      setLoading(false);
      return [];
    }
    
    setLoading(true);

    try {
      console.log('🔍 v78.0 - Fetching requests...');
      const fetchedRequests = await fetchRequests();
      
      console.log('🔍 v78.0 - Fetched:', fetchedRequests?.length, 'requests');
      
      if (fetchedRequests && fetchedRequests.length > 0) {
        const formattedRequests = fetchedRequests.map(request => formatRequestData(request));
        setRequests(formattedRequests);
        return formattedRequests;
      } else {
        setRequests([]);
        return [];
      }
    } catch (error) {
      console.error('🔍 v78.0 - Error loading requests:', error);
      setRequests([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchRequests]);

  useEffect(() => {
    console.log('🚨 v78.0 - MaintenanceRequest useEffect triggered');
    
    if (!isSessionReady) {
      console.log('🚨 v78.0 - Waiting for session ready...');
      return;
    }
    
    if (!currentUser?.id) {
      console.log('🚨 v78.0 - No current user, clearing requests');
      setRequests([]);
      setLoading(false);
      lastFetchedUserIdRef.current = null;
      return;
    }
    
    // Only fetch if user ID changed
    if (lastFetchedUserIdRef.current === currentUser.id) {
      console.log('🚨 v78.0 - User unchanged, skipping fetch');
      return;
    }
    
    lastFetchedUserIdRef.current = currentUser.id;
    console.log('🚨 v78.0 - Loading requests for user:', currentUser.email);
    
    loadRequests();
    
    // Real-time subscription
    console.log('🔌 REAL-TIME: Setting up maintenance_requests subscription');
    const channel = supabase
      .channel('maintenance-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_requests'
        },
        (payload) => {
          console.log('🔄 REAL-TIME: Maintenance request change:', payload.eventType);
          
          if (payload.eventType === 'INSERT' && payload.new) {
            const formattedRequest = formatRequestData(payload.new);
            setRequests(prev => {
              const exists = prev.some(r => r.id === formattedRequest.id);
              if (exists) return prev;
              return [formattedRequest, ...prev];
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const formattedRequest = formatRequestData(payload.new);
            setRequests(prev => prev.map(r => 
              r.id === formattedRequest.id ? formattedRequest : r
            ));
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setRequests(prev => prev.filter(r => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 REAL-TIME: Unsubscribing from maintenance requests');
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, isSessionReady, loadRequests]);

  const getRequestsForProperty = useCallback((propertyId: string) => {
    return requests.filter(request => request.propertyId === propertyId);
  }, [requests]);

  const addRequestToProperty = useCallback(async (requestData: Omit<MaintenanceRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    console.log('🆕 addRequestToProperty - Starting');
    
    const requestWithDefaults = {
      ...requestData,
      site: requestData.site || requestData.category || 'Unknown',
      title: requestData.title || requestData.issueNature || 'Untitled Request',
      location: requestData.location || 'Unknown',
      submittedBy: requestData.submittedBy || 'Anonymous'
    };
    
    const newRequest = await addRequest(requestWithDefaults);
    
    if (newRequest) {
      const formattedNewRequest = formatRequestData(newRequest);
      setRequests(prev => {
        const existingIndex = prev.findIndex(r => r.id === formattedNewRequest.id);
        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = formattedNewRequest;
          return updated;
        }
        return [formattedNewRequest, ...prev];
      });
      
      toast.success('Maintenance request added successfully. Redirecting...', { duration: 1500 });
      window.location.replace(`${window.location.origin}/dashboard`);
      
      return formattedNewRequest;
    }
    return null;
  }, [addRequest]);

  const contextValue = useMemo(() => ({
    requests,
    loading,
    getRequestsForProperty,
    addRequestToProperty,
    loadRequests,
  }), [
    requests,
    loading,
    getRequestsForProperty,
    addRequestToProperty,
    loadRequests
  ]);
  
  return contextValue;
};
