
import { useState, useEffect } from 'react';
import { MaintenanceRequest } from '@/types/maintenance';
import { useUserContext } from '@/contexts/UserContext';
import { useMaintenanceRequestOperations } from './useMaintenanceRequestOperations';
import { toast } from '@/lib/toast';

export const useMaintenanceRequestProvider = () => {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { currentUser } = useUserContext();
  const { fetchRequests, addRequest } = useMaintenanceRequestOperations(currentUser);

  useEffect(() => {
    if (currentUser) {
      loadRequests();
    } else {
      setRequests([]);
      setLoading(false);
    }
  }, [currentUser]);

  const loadRequests = async () => {
    const fetchedRequests = await fetchRequests();
    setRequests(fetchedRequests as MaintenanceRequest[]);
    setLoading(false);
  };

  const getRequestsForProperty = (propertyId: string) => {
    return requests.filter(request => request.propertyId === propertyId);
  };

  const addRequestToProperty = async (requestData: Omit<MaintenanceRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    const newRequest = await addRequest(requestData);
    if (newRequest) {
      setRequests(prev => [...prev, newRequest as MaintenanceRequest]);
      toast.success('Maintenance request added successfully');
      return newRequest as MaintenanceRequest;
    }
  };

  return {
    requests,
    loading,
    getRequestsForProperty,
    addRequestToProperty,
  };
};
