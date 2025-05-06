
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
  
  useEffect(() => {
    if (requestId) {
      const foundRequest = requests.find(req => req.id === requestId);
      setRequest(foundRequest || null);
      setLoading(false);
      
      // Log to debug request object and contractor assignment status
      console.log("Request detail - request:", foundRequest);
      console.log("Request detail - contractorId:", foundRequest?.contractorId);
      
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
          
          setQuotes(mappedQuotes);
        }
      };
      
      // Check if current user is a contractor
      const checkContractorStatus = async () => {
        if (!currentUser?.id) return;
        
        const { data, error } = await supabase
          .from('contractors')
          .select('id')
          .eq('user_id', currentUser.id);
          
        if (!error && data && data.length > 0) {
          setIsContractor(true);
        }
      };
      
      fetchQuotes();
      checkContractorStatus();
    }
  }, [requestId, requests, currentUser]);

  return {
    request,
    loading,
    quotes,
    isContractor
  };
};
