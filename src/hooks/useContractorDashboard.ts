
import { useState } from 'react';
import { MaintenanceRequest } from '@/types/maintenance';
import { useContractorIdentification } from './contractor/useContractorIdentification';
import { useContractorData } from './contractor/useContractorData';

export const useContractorDashboard = () => {
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  
  const { 
    contractorId, 
    setContractorId, 
    loading, 
    setLoading, 
    error, 
    setError 
  } = useContractorIdentification();
  
  const { 
    pendingQuoteRequests, 
    activeJobs, 
    completedJobs,
    refreshData: refreshContractorData
  } = useContractorData(contractorId, loading, setLoading, setError);

  const refreshData = () => {
    if (contractorId) {
      setLoading(true);
      // This will trigger the useEffect that fetches data
      setContractorId(contractorId);
      refreshContractorData();
    }
  };

  return {
    pendingQuoteRequests,
    activeJobs,
    completedJobs,
    loading,
    error,
    contractorId,
    refreshData,
    selectedRequest,
    setSelectedRequest
  };
};
