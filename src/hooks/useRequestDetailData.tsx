import { useState, useEffect } from 'react';
import { useMaintenanceRequestContext } from '@/contexts/maintenance';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import { Quote } from '@/types/contractor';
import { MaintenanceRequest } from '@/types/maintenance';

export const useRequestDetailData = (requestId: string | undefined) => {
  const { requests } = useMaintenanceRequestContext();
  const { currentUser } = useUserContext();
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isContractor, setIsContractor] = useState(false);
  
  // Effect for handling request data
  useEffect(() => {
    if (!requestId) return;
    
    const foundRequest = requests.find(req => req.id === requestId);
    if (foundRequest) {
      console.log("useRequestDetailData - Found request:", foundRequest);
      console.log("useRequestDetailData - contractorId:", foundRequest.contractorId);
      setRequest(foundRequest);
    } else {
      console.log("useRequestDetailData - Request not found for ID:", requestId);
    }
    
    setLoading(false);
  }, [requestId, requests]);
  
  // Effect for quotes and contractor status - keep these separate
  useEffect(() => {
    if (!requestId || !currentUser?.id) return;
    
    const fetchQuotes = async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        // Map database fields to our interface fields
        const mappedQuotes: Quote[] = data.map(quote => ({
          id: quote.id,
          requestId: quote.request_id,
          contractorId: quote.contractor_id,
          amount: quote.amount,
          description: quote.description || undefined,
          status: quote.status as 'requested' | 'pending' | 'approved' | 'rejected',
          submittedAt: quote.submitted_at,
          approvedAt: quote.approved_at || undefined,
          createdAt: quote.created_at,
          updatedAt: quote.updated_at
        }));
        
        console.log("useRequestDetailData - Fetched quotes:", mappedQuotes);
        setQuotes(mappedQuotes);
      } else if (error) {
        console.error("useRequestDetailData - Error fetching quotes:", error);
      }
    };
    
    // Check if current user is a contractor
    const checkContractorStatus = async () => {
      const { data, error } = await supabase
        .from('contractors')
        .select('id')
        .eq('user_id', currentUser.id);
        
      if (!error && data && data.length > 0) {
        console.log("useRequestDetailData - User is a contractor");
        setIsContractor(true);
      } else {
        console.log("useRequestDetailData - User is not a contractor");
        setIsContractor(false);
      }
    };
    
    fetchQuotes();
    checkContractorStatus();
  }, [requestId, currentUser?.id]);

  return {
    request,
    loading,
    quotes,
    isContractor
  };
};
